import { describe, it, expect, vi, afterEach } from 'vitest'
import { convert } from '../src/services/currency'
import { translate } from '../src/services/translate'
import { lookup } from '../src/services/dictionary'

function mockFetch(impl: (url: string) => { ok?: boolean; status?: number; json: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const r = impl(url)
      return {
        ok: r.ok ?? true,
        status: r.status ?? 200,
        json: async () => r.json,
      } as Response
    }),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('convert', () => {
  it('short-circuits when base === target (no fetch)', async () => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    const r = await convert('100 USD', 'USD', 'USD')
    expect(r).toEqual({ amount: 100, from: 'USD', to: 'USD', rate: 1, converted: 100, date: '' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('uses frankfurter when both sides are ECB currencies', async () => {
    mockFetch((url) => {
      expect(url).toContain('frankfurter.dev')
      return { json: { date: '2026-08-24', rates: { EUR: 0.9 } } }
    })
    const r = await convert('100 USD', 'USD', 'EUR')
    expect(r).toMatchObject({ from: 'USD', to: 'EUR', rate: 0.9, converted: 90, date: '2026-08-24' })
  })

  it('falls back to er-api when a side is outside the ECB set', async () => {
    mockFetch((url) => {
      expect(url).toContain('open.er-api.com')
      return {
        json: {
          result: 'success',
          rates: { BDT: 120 },
          time_last_update_utc: '2026-08-24T00:00:01 +0000',
        },
      }
    })
    const r = await convert('2 USD', 'USD', 'BDT')
    expect(r).toMatchObject({ rate: 120, converted: 240, date: '2026-08-24T00:00' })
  })

  it('throws on unsupported target', async () => {
    await expect(convert('100 USD', 'USD', 'XYZ')).rejects.toThrow(/Unsupported currency: XYZ/)
  })

  it('throws when no amount is present', async () => {
    await expect(convert('hello', 'USD', 'EUR')).rejects.toThrow(/No amount/)
  })

  it('baseOverride wins over the code detected in text', async () => {
    mockFetch(() => ({ json: { date: '', rates: { USD: 1.1 } } }))
    const r = await convert('100 USD', 'USD', 'USD', 'EUR')
    expect(r.from).toBe('EUR')
    expect(r.to).toBe('USD')
  })

  it('throws when the rate is missing from the response', async () => {
    mockFetch(() => ({ json: { date: '', rates: {} } }))
    await expect(convert('100 USD', 'USD', 'EUR')).rejects.toThrow(/Rate unavailable/)
  })
})

describe('translate', () => {
  it('joins multi-segment translations and reports detected language', async () => {
    mockFetch(() => ({
      json: [[['Hello '], ['world']], null, 'es'],
    }))
    const r = await translate('Hola mundo', 'en')
    expect(r).toEqual({ from: 'Spanish', to: 'English', source: 'Hola mundo', translation: 'Hello world' })
  })

  it('throws on a non-ok response', async () => {
    mockFetch(() => ({ ok: false, status: 500, json: null }))
    await expect(translate('x', 'en')).rejects.toThrow(/Translate failed \(500\)/)
  })
})

describe('lookup', () => {
  it('parses word, phonetic, and senses (single-word only)', async () => {
    mockFetch((url) => {
      expect(url).toContain('/en/hello') // trims to the first word
      return {
        json: {
          word: 'hello',
          entries: [
            {
              language: { name: 'English' },
              partOfSpeech: 'interjection',
              pronunciations: [{ type: 'ipa', text: '/həˈloʊ/' }],
              senses: [{ definition: 'a greeting', examples: ['hello there'], synonyms: ['hi'] }],
            },
          ],
        },
      }
    })
    const r = await lookup('hello world', 'en')
    expect(r.word).toBe('hello')
    expect(r.phonetic).toBe('/həˈloʊ/')
    expect(r.senses[0]).toMatchObject({ definition: 'a greeting', example: 'hello there' })
    expect(r.senses[0].synonyms).toContain('hi')
  })

  it('throws a friendly message on 404', async () => {
    mockFetch(() => ({ ok: false, status: 404, json: null }))
    await expect(lookup('asdfgh', 'en')).rejects.toThrow(/No definition found for "asdfgh"/)
  })

  it('throws when entries are empty', async () => {
    mockFetch(() => ({ json: { word: 'x', entries: [] } }))
    await expect(lookup('x', 'en')).rejects.toThrow(/No definition found/)
  })
})
