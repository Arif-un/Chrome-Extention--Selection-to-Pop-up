// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { AI_HASH_KEY } from '../src/lib/ai-targets'
import { maybeInjectPrompt } from '../src/content/ai-inject'

// maybeInjectPrompt reads window.location + calls history.replaceState. Stub both
// so we can pretend the page is a given AI host with a given hash.
function stubPage(hostname: string, hash: string) {
  const replaceState = vi.fn()
  vi.stubGlobal('location', { hostname, hash, pathname: '/', search: '' })
  vi.stubGlobal('history', { replaceState })
  return replaceState
}

// Let the fire-and-forget waitAndFill microtask/observer settle.
const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  document.body.innerHTML = ''
})
afterEach(() => vi.unstubAllGlobals())

describe('maybeInjectPrompt', () => {
  it('does nothing on a non-AI host', async () => {
    const replaceState = stubPage('example.com', `#${AI_HASH_KEY}=hi`)
    maybeInjectPrompt()
    await flush()
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('does nothing on an AI host with no prompt hash', async () => {
    const replaceState = stubPage('chatgpt.com', '#other=1')
    maybeInjectPrompt()
    await flush()
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('fills a textarea composer and clears the hash', async () => {
    const replaceState = stubPage('chatgpt.com', `#${AI_HASH_KEY}=hello%20world`)
    const ta = document.createElement('textarea')
    ta.id = 'prompt-textarea'
    document.body.appendChild(ta)
    const onInput = vi.fn()
    ta.addEventListener('input', onInput)

    maybeInjectPrompt()
    await flush()

    expect(ta.value).toBe('hello world')
    expect(onInput).toHaveBeenCalled()
    expect(replaceState).toHaveBeenCalledWith(null, '', '/')
  })

  it('fills a contenteditable composer via textContent', async () => {
    stubPage('gemini.google.com', `#${AI_HASH_KEY}=hi%20gemini`)
    const editor = document.createElement('div')
    editor.className = 'ql-editor'
    editor.setAttribute('contenteditable', 'true')
    document.body.appendChild(editor)

    maybeInjectPrompt()
    await flush()

    expect(editor.textContent).toBe('hi gemini')
  })
})
