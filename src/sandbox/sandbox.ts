/**
 * Sandboxed executor for user-defined JS custom actions.
 * Runs in a sandboxed iframe (opaque origin, no chrome.* APIs, no extension
 * privileges). Receives { id, code, input } and returns { id, result | error }.
 *
 * Contract for user code: it is a function body with `input` in scope
 * (`{ text, url, title }`) and must `return` a string or URL.
 */
interface RunMsg {
  id: string
  code: string
  input: { text: string; url: string; title: string }
}

window.addEventListener('message', (e: MessageEvent) => {
  const data = e.data as Partial<RunMsg>
  if (!data || typeof data.code !== 'string' || typeof data.id !== 'string') return

  let result = ''
  let error: string | undefined
  try {
    const fn = new Function('input', '"use strict";\n' + data.code)
    const out = fn(data.input ?? {})
    result = out == null ? '' : String(out)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  const target = e.source as Window | null
  target?.postMessage({ id: data.id, result, error }, '*')
})
