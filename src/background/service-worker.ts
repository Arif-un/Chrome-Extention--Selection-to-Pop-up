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
const SHOW_ID = 'stp-show'

// Strip framing headers on sub-frame loads of AI domains so our surfaces can embed
// them. Scoped three ways: sub_frame + AI request domains + initiatorDomains =
// [extension origin]. That last one is the key: the strip fires ONLY when the AI
// frame is initiated by our own extension pages (the side panel, and the in-page
// PreviewFrame which nests the AI through an extension wrapper page — see
// PreviewFrame.tsx). An arbitrary website that tries to iframe the AI session
// directly does NOT match (its initiator is the page origin), so its X-Frame-Options
// / CSP stay intact — no clickjacking, no borrowed XSS surface. Rules are
// session-scoped (reset on restart), so (re)install on startup and install.
//
// Request headers are spoofed to a top-level navigation (Sec-Fetch-Site: none,
// Referer removed) so targets that refuse framing via fetch-metadata still load.
const AI_FRAME_RULE_ID = 1001

/** AI hosts the user has actually granted — the DNR strip only covers these. */
async function grantedAiDomains(): Promise<string[]> {
  const checks = await Promise.all(
    AI_DOMAINS.map(async (d) =>
      (await chrome.permissions.contains({ origins: [`https://${d}/*`] })) ? d : null,
    ),
  )
  return checks.filter((d): d is string => d !== null)
}

async function installAiFrameRules() {
  if (!chrome.declarativeNetRequest?.updateSessionRules) return
  // Hosts are optional: modifying their headers needs granted host access, so a
  // rule naming ungranted domains is rejected. Scope requestDomains to grants.
  const domains = await grantedAiDomains()
  if (!domains.length) {
    await chrome.declarativeNetRequest
      .updateSessionRules({ removeRuleIds: [AI_FRAME_RULE_ID] })
      .catch(() => {})
    return
  }
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [AI_FRAME_RULE_ID],
      addRules: [
        {
          id: AI_FRAME_RULE_ID,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            requestHeaders: [
              {
                header: 'sec-fetch-dest',
                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                value: 'document',
              },
              {
                header: 'sec-fetch-mode',
                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                value: 'navigate',
              },
              {
                header: 'sec-fetch-site',
                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                value: 'none',
              },
              {
                header: 'referer',
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
              },
            ],
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
            requestDomains: domains,
            // Only strip for frames our extension pages initiate (side panel +
            // the in-page wrapper). Closes the clickjacking / XSS hole.
            initiatorDomains: [chrome.runtime.id],
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME],
          },
        },
      ],
    })
  } catch (e) {
    // declarativeNetRequest unavailable / rule rejected — iframe modes just won't
    // load. Surface it so a Chrome API change doesn't fail completely silently.
    console.warn('STP: failed to install AI frame DNR rules', e)
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

// Serialize menu rebuilds. onInstalled/onStartup and onSettingsChange can fire
// overlapping rebuilds (a schema-migration write during onInstalled triggers
// storage.onChanged mid-build); two interleaved removeAll→create sequences leave
// duplicate or missing items. Chain them so each removeAll→create runs whole.
let menuBuild: Promise<void> = Promise.resolve()
function queueBuildMenus(settings: Settings): Promise<void> {
  menuBuild = menuBuild.catch(() => {}).then(() => buildMenus(settings))
  return menuBuild
}

async function buildMenus(settings: Settings) {
  await chrome.contextMenus.removeAll()
  chrome.contextMenus.create({
    id: PARENT_ID,
    title: 'Select to Action',
    contexts: ['selection'],
  })

  // Re-show the in-page action popup for the current selection (when it was
  // dismissed but the selection still holds). Routes to TRIGGER_SELECTION, same
  // as the popup button and the hotkey.
  chrome.contextMenus.create({
    id: SHOW_ID,
    parentId: PARENT_ID,
    title: 'Show action popup',
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

chrome.runtime.onInstalled.addListener(async (details) => {
  const settings = await getSettings() // runs migration if needed
  await queueBuildMenus(settings)
  await installAiFrameRules()
  // Fresh install only (not updates): drop the user on the settings page, where
  // the first-visit tour auto-runs.
  if (details.reason === 'install') chrome.runtime.openOptionsPage()
})

chrome.runtime.onStartup.addListener(async () => {
  await queueBuildMenus(await getSettings())
  await installAiFrameRules()
})

onSettingsChange((settings) => {
  void queueBuildMenus(settings)
})

// AI hosts are optional — rebuild the frame-header rule whenever a grant is
// added (framing now allowed) or removed (stop stripping that host).
chrome.permissions.onAdded.addListener(() => void installAiFrameRules())
chrome.permissions.onRemoved.addListener(() => void installAiFrameRules())

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return
  const action = String(info.menuItemId)
  if (action === PARENT_ID) return
  if (action === SHOW_ID) {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_SELECTION' } satisfies Command).catch(() => {})
    return
  }
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
