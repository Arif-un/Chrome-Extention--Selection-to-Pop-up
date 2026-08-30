import { getSettings, onSettingsChange } from '../lib/settings'
import type { Settings } from '../lib/types'
import { ok, err, type Request, type Command } from '../lib/messages'
import { BUILTIN_LABELS, type BuiltinKey } from '../lib/builtins'
import { actionTokens, MORE } from '../lib/actions'
import { translate } from '../services/translate'
import { lookup } from '../services/dictionary'
import { convert } from '../services/currency'
import { AI_DOMAINS } from '../lib/ai-targets'

const PARENT_ID = 'stp-root'

// Strip framing headers ONLY on sub-frame loads of AI domains, so the in-page
// iframe window / side panel can embed them. Scoped to sub_frame + AI domains =
// normal top-level browsing of those sites keeps its CSP. Rules are session-scoped
// (reset on restart), so (re)install them on startup and install.
//
// ponytail: KNOWN RISK - clickjacking AND loss of the AI origin's own XSS defense.
// No initiatorDomains scoping, because the in-page PreviewFrame is initiated by
// whatever arbitrary page the user is on, not by the extension. DNR can only drop a
// whole header, not one directive, so to allow framing we strip the entire CSP (not
// just frame-ancestors) plus x-frame-options. For any site's sub-frame to these
// hosts that means: (a) it can iframe the AI session and overlay bait UI
// (clickjacking); and (b) the framed AI document loses its script-src/CSP, so a
// CSP-blocked reflected/DOM-XSS on the AI site could execute where it otherwise
// wouldn't (third-party frames are SameSite=Lax logged-out, which limits account
// impact). Accepted to keep the in-page iframe preview. Upgrade path: drop the
// in-page iframe (side-panel + popup-window only, both extension-initiated) and add
// initiatorDomains scoped to the extension origin.
const AI_FRAME_RULE_ID = 1001
async function installAiFrameRules() {
  if (!chrome.declarativeNetRequest?.updateSessionRules) return
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [AI_FRAME_RULE_ID],
      addRules: [
        {
          id: AI_FRAME_RULE_ID,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            responseHeaders: [
              {
                header: 'x-frame-options',
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
              },
              {
                header: 'frame-options',
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
              },
              {
                header: 'content-security-policy',
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
              },
            ],
          },
          condition: {
            requestDomains: AI_DOMAINS,
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME],
          },
        },
      ],
    })
  } catch {
    // declarativeNetRequest unavailable / rule rejected — iframe modes just won't load
  }
}

/**
 * Open an AI surface in a real (logged-in) tab, popup window, or the side panel.
 * Synchronous (no awaits before sidePanel.open) so the content-click user gesture
 * survives the message hop — chrome.sidePanel.open() rejects without one.
 */
function openAi(
  msg: { url: string; mode: 'tab' | 'window' | 'sidebar'; win?: { w: number; h: number } },
  tabId: number | undefined,
  done: () => void,
) {
  if (msg.mode === 'sidebar' && tabId != null && chrome.sidePanel) {
    // Set the path (fire-and-forget) and open in the SAME gesture tick.
    void chrome.sidePanel.setOptions({
      tabId,
      path: `src/sidepanel/index.html?u=${encodeURIComponent(msg.url)}`,
      enabled: true,
    })
    chrome.sidePanel
      .open({ tabId })
      .then(done)
      .catch(() => {
        // no gesture / API unavailable — fall back to a plain tab
        void chrome.tabs.create({ url: msg.url }).finally(done)
      })
    return
  }
  if (msg.mode === 'window') {
    void chrome.windows
      .create({ url: msg.url, type: 'popup', width: msg.win?.w ?? 460, height: msg.win?.h ?? 640 })
      .finally(done)
    return
  }
  void chrome.tabs.create({ url: msg.url }).finally(done)
}

async function buildMenus(settings: Settings) {
  await chrome.contextMenus.removeAll()
  chrome.contextMenus.create({
    id: PARENT_ID,
    title: 'Select to Action',
    contexts: ['selection'],
  })

  // Walk the same unified token list the tooltip uses so the two stay in lockstep
  // (same actions, same enabled flags, same order). Context menus have no overflow
  // split, so the MORE divider is ignored — every enabled action is shown.
  for (const t of actionTokens(settings.actionOrder, settings.customActions, settings.aiActions)) {
    if (t === MORE) continue
    let title: string | null = null
    if (t.startsWith('ai:')) {
      const ai = settings.aiActions.find((x) => `ai:${x.target}` === t)
      if (ai?.enabled) title = `${ai.label} "%s"`
    } else if (t.startsWith('custom:')) {
      const a = settings.customActions.find((x) => `custom:${x.id}` === t)
      if (a?.enabled) title = a.name
    } else {
      const k = t as BuiltinKey
      if (settings.builtins[k]) title = `${BUILTIN_LABELS[k]} "%s"`
    }
    if (!title) continue
    chrome.contextMenus.create({
      id: t,
      parentId: PARENT_ID,
      title,
      contexts: ['selection'],
    })
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings() // runs migration if needed
  await buildMenus(settings)
  await installAiFrameRules()
})

chrome.runtime.onStartup.addListener(async () => {
  await buildMenus(await getSettings())
  await installAiFrameRules()
})

onSettingsChange((settings) => {
  void buildMenus(settings)
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return
  const action = String(info.menuItemId)
  if (action === PARENT_ID) return
  // menuItemId IS the action token (builtin key / `custom:<id>` / `ai:<target>`),
  // matching the tooltip; the content script routes it the same way.
  const cmd: Command = { type: 'PERFORM_ACTION', action, text: info.selectionText }
  chrome.tabs.sendMessage(tab.id, cmd).catch(() => {
    /* content script not present on this page */
  })
})

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'act-on-selection') return
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id) {
      const cmd: Command = { type: 'TRIGGER_SELECTION' }
      chrome.tabs.sendMessage(tab.id, cmd).catch(() => {})
    }
  })
})

// Data request router (used by content script and popup).
chrome.runtime.onMessage.addListener((msg: Request, _sender, sendResponse) => {
  // OPEN_AI runs synchronously (no await first) so sidePanel.open() keeps the
  // content-click user gesture it requires.
  if (msg.type === 'OPEN_AI') {
    openAi(msg, _sender.tab?.id, () => sendResponse(ok(null)))
    return true
  }
  ;(async () => {
    try {
      const s = await getSettings()
      switch (msg.type) {
        case 'TRANSLATE':
          sendResponse(ok(await translate(msg.text, msg.targetLang ?? s.translate.targetLang)))
          break
        case 'DICTIONARY':
          sendResponse(ok(await lookup(msg.word, s.dictionary.lang)))
          break
        case 'CURRENCY':
          sendResponse(
            ok(await convert(msg.text, s.currency.base, msg.target ?? s.currency.target, msg.base)),
          )
          break
        default:
          sendResponse(err('Unknown request'))
      }
    } catch (e) {
      sendResponse(err(e instanceof Error ? e.message : String(e)))
    }
  })()
  return true // async response
})
