import { render, h, Fragment } from 'preact'
import { store } from './store'
import { Tooltip } from './Tooltip'
import { Handles } from './Handles'
import { anchorFor } from './anchor'
import type { Command } from '../lib/messages'
// Compiled Tailwind CSS as a string, injected into the shadow root for isolation.
import css from './tooltip.css?inline'

const HOST_ID = '__stp_host'
const TOOLTIP_W = 320 // approx max panel width, used to centre fallback popups

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
  render(h(Fragment, null, h(Tooltip, {}), h(Handles, {})), app)
}

// Show buttons on selection (if enabled). A mouse handle-drag ends with a
// compatibility mouseup too — skip it so it doesn't reset an open result panel.
document.addEventListener('mouseup', (e) => {
  if (store.consumeDragEnd()) return
  const cursor = { x: e.clientX, y: e.clientY }
  setTimeout(() => {
    if (!store.state.settings?.trigger.onSelection) return
    const s = anchorFor(undefined, undefined, cursor)
    if (s) store.showButtons(s.text, s.x, s.y)
    else store.hide()
  }, 0)
})

// Keep the drag handles in sync with the selection (independent of the popup)
// and keep an open popup anchored to it, recomputing as the page moves.
// syncHandles returns geometry so the anchor reuses it instead of measuring
// twice. rAF-coalesced so it recomputes at most once per frame — selectionchange
// fires ~per pointermove during a field drag-select, and the field-geometry path
// rebuilds a mirror div + forces reflow, so coalescing avoids layout thrash.
let repositionRaf = 0
const reposition = () => {
  if (repositionRaf) return
  repositionRaf = requestAnimationFrame(() => {
    repositionRaf = 0
    const g = store.syncHandles()
    if (store.state.open) {
      const s = anchorFor(undefined, g)
      if (s) store.updateAnchor(s.text, s.x, s.y)
    }
  })
}
document.addEventListener('selectionchange', reposition)
window.addEventListener('scroll', reposition, { capture: true, passive: true })
window.addEventListener('resize', reposition, { passive: true })

// Hide when clicking elsewhere (tooltip and handles stop their own propagation).
document.addEventListener('mousedown', () => store.hide())

// Commands from background (context menu / hotkey).
chrome.runtime.onMessage.addListener((msg: Command) => {
  if (msg.type === 'TRIGGER_SELECTION') {
    const s = anchorFor()
    if (s) store.showButtons(s.text, s.x, s.y)
  } else if (msg.type === 'PERFORM_ACTION') {
    const s = anchorFor()
    const text = (msg.text ?? s?.text ?? '').trim()
    if (!text) return
    const x = s?.x ?? Math.round(window.innerWidth / 2) - TOOLTIP_W / 2
    const y = s?.y ?? 80
    store.showButtons(text, x, y)
    void store.perform(msg.action, text)
  }
})

void store.init().then(mount)
