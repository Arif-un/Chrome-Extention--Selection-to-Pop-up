// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { sanitizeSvg, resolveIcon } from '../src/lib/svg-icon'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h4v4H0z"/></svg>'

describe('sanitizeSvg', () => {
  it('keeps valid svg', () => {
    expect(sanitizeSvg(SVG)).toContain('<svg')
    expect(sanitizeSvg(SVG)).toContain('<path')
  })

  it('strips <script> and on* handlers', () => {
    const dirty = '<svg onload="alert(1)"><script>alert(1)</script><path d="M0 0"/></svg>'
    const clean = sanitizeSvg(dirty)
    expect(clean).not.toContain('script')
    expect(clean).not.toContain('onload')
  })

  it('rejects non-svg', () => {
    expect(() => sanitizeSvg('<div>hi</div>')).toThrow()
  })

  it('rejects oversize icons', () => {
    const huge = `<svg>${'<path d="M0 0"/>'.repeat(400)}</svg>`
    expect(() => sanitizeSvg(huge)).toThrow(/too large/i)
  })
})

describe('resolveIcon', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('accepts raw markup', async () => {
    expect(await resolveIcon(SVG)).toContain('<svg')
  })

  it('decodes a base64 data URL', async () => {
    const url = `data:image/svg+xml;base64,${btoa(SVG)}`
    expect(await resolveIcon(url)).toContain('<path')
  })

  it('decodes a utf8 data URL', async () => {
    const url = `data:image/svg+xml,${encodeURIComponent(SVG)}`
    expect(await resolveIcon(url)).toContain('<path')
  })

  it('fetches an http URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(SVG) }),
    )
    expect(await resolveIcon('https://cdn.example/icon.svg')).toContain('<svg')
  })

  it('rejects a URL that returns non-svg', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('<html/>') }),
    )
    await expect(resolveIcon('https://cdn.example/nope')).rejects.toThrow(/did not return an SVG/i)
  })

  it('gives a friendly error on CORS/network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(resolveIcon('https://blocked.example/icon.svg')).rejects.toThrow(/CORS/i)
  })

  it('surfaces an HTTP error status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('') }),
    )
    await expect(resolveIcon('https://cdn.example/missing.svg')).rejects.toThrow(/HTTP 404/)
  })
})
