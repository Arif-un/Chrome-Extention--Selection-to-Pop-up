import { render, h } from 'preact'
import { store } from './store'
import { Tooltip } from './Tooltip'
import type { Command } from '../lib/messages'
// Compiled Tailwind CSS as a string, injected into the shadow root for isolation.
import css from './tooltip.css?inline'

const HOST_ID = '__stp_host'
const TOOLTIP_H = 44 // approx button-row height for positioning
const TOOLTIP_W = 320 // approx max panel width, for clamping x within the viewport

function mount() {
  if (document.getElementById(HOST_ID)) return
  const host = document.createElement('div')
  host.id = HOST_ID
  // Keep the host inert without `all: initial` — that breaks backdrop-filter in
  // the shadow tree. Explicitly null out properties that would otherwise break
  // the popup's fixed positioning and backdrop blur if a page sets them on divs.
  host.style.cssText =
    'position: absolute; top: 0; left: 0; width: 0; height: 0; margin: 0; padding: 0; border: 0; transform: none; filter: none; contain: none; will-change: auto;'
  document.documentElement.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  // Tailwind v4 puts theme vars on :root, which does not match inside a shadow
  // root — remap to :host so utilities resolve their CSS variables.
  style.textContent = css.replaceAll(':root', ':host')
  shadow.appendChild(style)

  const app = document.createElement('div')
  shadow.appendChild(app)
  render(h(Tooltip, {}), app)
}

function currentSelection(): { text: string; x: number; y: number } | null {
  const sel = window.getSelection()
  const text = sel?.toString().trim() ?? ''
  if (!text || !sel || sel.rangeCount === 0) return null
  const rect = sel.getRangeAt(0).getBoundingClientRect()
  const a = store.state.settings?.appearance
  const above = rect.top - TOOLTIP_H - 6
  const below = rect.bottom + 6

  let y: number
  if (a?.anchor === 'below') y = below
  else if (a?.anchor === 'above') y = above
  else y = above < 8 ? below : above // auto

  const x = Math.max(8, Math.min(rect.left + (a?.offsetX ?? 0), window.innerWidth - TOOLTIP_W))
  y += a?.offsetY ?? 0
  return { text, x, y }
}

// Show buttons on selection (if enabled).
document.addEventListener('mouseup', () => {
  setTimeout(() => {
    if (!store.state.settings?.trigger.onSelection) return
    const s = currentSelection()
    if (s) store.showButtons(s.text, s.x, s.y)
    else store.hide()
  }, 0)
})

// Hide when clicking elsewhere (tooltip stops its own propagation).
document.addEventListener('mousedown', () => store.hide())

// Commands from background (context menu / hotkey).
chrome.runtime.onMessage.addListener((msg: Command) => {
  if (msg.type === 'TRIGGER_SELECTION') {
    const s = currentSelection()
    if (s) store.showButtons(s.text, s.x, s.y)
  } else if (msg.type === 'PERFORM_ACTION') {
    const s = currentSelection()
    const text = (msg.text ?? s?.text ?? '').trim()
    if (!text) return
    const x = s?.x ?? Math.round(window.innerWidth / 2) - TOOLTIP_W / 2
    const y = s?.y ?? 80
    store.showButtons(text, x, y)
    void store.perform(msg.action, text)
  }
})

void store.init().then(mount)
