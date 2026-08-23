import { getSettings, onSettingsChange } from '../lib/settings'
import type { Settings } from '../lib/types'
import { ok, err, type Request, type Command } from '../lib/messages'
import { BUILTIN_LABELS } from '../lib/builtins'
import { translate } from '../services/translate'
import { lookup } from '../services/dictionary'
import { convert } from '../services/currency'

const PARENT_ID = 'stp-root'

async function buildMenus(settings: Settings) {
  await chrome.contextMenus.removeAll()
  chrome.contextMenus.create({
    id: PARENT_ID,
    title: 'Selection To PopUp',
    contexts: ['selection'],
  })

  for (const [key, enabled] of Object.entries(settings.builtins) as [
    keyof Settings['builtins'],
    boolean,
  ][]) {
    if (!enabled) continue
    chrome.contextMenus.create({
      id: `builtin:${key}`,
      parentId: PARENT_ID,
      title: `${BUILTIN_LABELS[key]} "%s"`,
      contexts: ['selection'],
    })
  }

  for (const action of settings.customActions) {
    if (!action.enabled) continue
    chrome.contextMenus.create({
      id: `custom:${action.id}`,
      parentId: PARENT_ID,
      title: action.name,
      contexts: ['selection'],
    })
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings() // runs migration if needed
  await buildMenus(settings)
})

chrome.runtime.onStartup.addListener(async () => {
  await buildMenus(await getSettings())
})

onSettingsChange((settings) => {
  void buildMenus(settings)
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return
  const id = String(info.menuItemId)
  const action = id.startsWith('builtin:')
    ? id.slice('builtin:'.length)
    : id.startsWith('custom:')
      ? `custom:${id.slice('custom:'.length)}`
      : null
  if (!action) return
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
