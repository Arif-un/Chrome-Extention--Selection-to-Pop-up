import { describe, it, expect, vi, afterEach } from 'vitest'
import { hasAiPermission, requestAiPermission } from '../src/lib/ai-permissions'

/** Stub chrome.permissions.request, capturing the origins it receives. */
function stubPermissions(granted: boolean) {
  const requestFn = vi.fn(async () => granted)
  const containsFn = vi.fn(async () => granted)
  vi.stubGlobal('chrome', { permissions: { request: requestFn, contains: containsFn } })
  return { requestFn, containsFn }
}

afterEach(() => vi.unstubAllGlobals())

describe('requestAiPermission', () => {
  it('requests the target host origins and returns the result', async () => {
    const { requestFn } = stubPermissions(true)
    await expect(requestAiPermission('claude')).resolves.toBe(true)
    expect(requestFn).toHaveBeenCalledWith({ origins: ['https://claude.ai/*'] })
  })

  it('requests every host for a multi-domain target', async () => {
    const { requestFn } = stubPermissions(true)
    await requestAiPermission('chatgpt')
    expect(requestFn).toHaveBeenCalledWith({
      origins: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
    })
  })

  it('reflects a denied request', async () => {
    stubPermissions(false)
    await expect(requestAiPermission('grok')).resolves.toBe(false)
  })
})

describe('hasAiPermission', () => {
  it('checks contains (no prompt) and reflects a granted host', async () => {
    const { containsFn, requestFn } = stubPermissions(true)
    await expect(hasAiPermission('claude')).resolves.toBe(true)
    expect(containsFn).toHaveBeenCalledWith({ origins: ['https://claude.ai/*'] })
    expect(requestFn).not.toHaveBeenCalled()
  })

  it('reflects a missing host', async () => {
    stubPermissions(false)
    await expect(hasAiPermission('gemini')).resolves.toBe(false)
  })
})
