/** Client that runs a user JS custom action inside the sandbox iframe. */

let frame: HTMLIFrameElement | null = null
let loaded = false
let seq = 0
const pending = new Map<string, (v: { result: string; error?: string }) => void>()

function ensureFrame(): HTMLIFrameElement {
  if (frame) return frame
  const f = document.createElement('iframe')
  f.src = chrome.runtime.getURL('src/sandbox/sandbox.html')
  f.style.display = 'none'
  f.setAttribute('aria-hidden', 'true')
  f.addEventListener('load', () => (loaded = true), { once: true })
  document.documentElement.appendChild(f)
  frame = f

  window.addEventListener('message', (e: MessageEvent) => {
    // Only trust replies from our own sandbox iframe; the page shares this window.
    if (e.source !== f.contentWindow) return
    const data = e.data as { id?: string; result?: string; error?: string }
    if (!data?.id || !pending.has(data.id)) return
    pending.get(data.id)!({ result: data.result ?? '', error: data.error })
    pending.delete(data.id)
  })
  return f
}

export function runJsAction(
  code: string,
  input: { text: string; url: string; title: string },
  timeoutMs = 3000,
): Promise<string> {
  const f = ensureFrame()
  const id = `js-${seq++}`
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('Custom action timed out'))
    }, timeoutMs)

    pending.set(id, ({ result, error }) => {
      clearTimeout(timer)
      if (error) reject(new Error(error))
      else resolve(result)
    })

    const send = () => f.contentWindow?.postMessage({ id, code, input }, '*')
    if (loaded) send()
    else f.addEventListener('load', send, { once: true })
  })
}
