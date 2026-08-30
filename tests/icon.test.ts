import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchSvg } from '../src/services/icon'

const mockFetch = (impl: () => Promise<Partial<Response>> | Partial<Response>) => {
  vi.stubGlobal('fetch', vi.fn(impl as () => Promise<Response>))
}

afterEach(() => vi.unstubAllGlobals())

describe('fetchSvg', () => {
  it('returns markup for an SVG body', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" /></svg>'
    mockFetch(() => ({ ok: true, status: 200, text: () => Promise.resolve(svg) }))
    expect(await fetchSvg('https://x/icon.svg')).toBe(svg)
  })

  it('throws a CORS hint when the request rejects', async () => {
    mockFetch(() => Promise.reject(new Error('network')))
    await expect(fetchSvg('https://x/icon.svg')).rejects.toThrow(/CORS/)
  })

  it('throws with the HTTP status on a non-ok response', async () => {
    mockFetch(() => ({ ok: false, status: 404, text: () => Promise.resolve('nope') }))
    await expect(fetchSvg('https://x/icon.svg')).rejects.toThrow(/HTTP 404/)
  })

  it('throws when the body is not an SVG', async () => {
    mockFetch(() => ({ ok: true, status: 200, text: () => Promise.resolve('<html>not svg</html>') }))
    await expect(fetchSvg('https://x/icon.svg')).rejects.toThrow(/did not return an SVG/)
  })
})
