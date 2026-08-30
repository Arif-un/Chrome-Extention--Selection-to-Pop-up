import { targetForHost, promptFromHash, type AiTargetDef } from '../lib/ai-targets'

/**
 * When the current page/frame is an AI target opened with a hash-carried prompt
 * (targets without a query-param composer, e.g. Gemini), type the prompt into
 * the composer. Runs in every frame (content script is all_frames), so it also
 * drives the in-page iframe window.
 *
 * Prefill only, never auto-submits: the hash is attacker-craftable (a link like
 * host#__stp_ai=... would otherwise fire a prompt into the victim's logged-in
 * session), so the user must press send themselves.
 *
 * ponytail: selector-driven typing breaks whenever the AI redesigns its
 * composer; all selectors live in ai-targets.ts for a one-file fix.
 */
export function maybeInjectPrompt() {
  const def = targetForHost(location.hostname)
  if (!def) return
  const prompt = promptFromHash(location.hash)
  if (!prompt) return
  // Clear the hash so a reload / SPA navigation doesn't re-inject.
  history.replaceState(null, '', location.pathname + location.search)
  void waitAndFill(def, prompt)
}

async function waitAndFill(def: AiTargetDef, prompt: string) {
  const input = await waitFor<HTMLElement>(def.inject.input, 15000)
  if (!input) return
  setInputValue(input, prompt)
}

/** First element matching any selector, tried in priority order. */
function queryFirst<T extends Element>(selectors: string[]): T | null {
  for (const sel of selectors) {
    const el = document.querySelector<T>(sel)
    if (el) return el
  }
  return null
}

function setInputValue(el: HTMLElement, value: string) {
  el.focus()
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    // Use the native setter so React/framework state tracks the change.
    const proto = Object.getPrototypeOf(el)
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(el, value)
    else el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
  } else {
    // contenteditable composer (Claude, Gemini): insert as text.
    el.textContent = value
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }))
  }
}

function waitFor<T extends Element>(selectors: string[], timeout: number): Promise<T | null> {
  return new Promise((resolve) => {
    const found = queryFirst<T>(selectors)
    if (found) return resolve(found)
    let timer = 0
    const obs = new MutationObserver(() => {
      const el = queryFirst<T>(selectors)
      if (el) {
        clearTimeout(timer)
        obs.disconnect()
        resolve(el)
      }
    })
    obs.observe(document.documentElement, { childList: true, subtree: true })
    timer = self.setTimeout(() => {
      obs.disconnect()
      resolve(queryFirst<T>(selectors))
    }, timeout)
  })
}
