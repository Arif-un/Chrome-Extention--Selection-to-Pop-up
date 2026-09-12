import { describe, it, expect, vi, afterEach } from 'vitest'
import { convert } from '../src/services/currency'
import { translate } from '../src/services/translate'
import { lookup } from '../src/services/dictionary'
import { langName } from '../src/lib/langs'

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
  it('uses the keyed PA endpoint and reports detected language', async () => {
    const spy = vi.fn((url: string) => {
      expect(url).toContain('translate-pa.googleapis.com/v1/translate')
      return { json: { translation: 'Hello world', sourceLanguage: 'es' } }
    })
    mockFetch(spy)
    const r = await translate('Hola mundo', 'en')
    expect(r).toEqual({ from: 'Spanish', to: 'English', source: 'Hola mundo', translation: 'Hello world' })
    expect(spy).toHaveBeenCalledTimes(1) // no fallback when PA succeeds
  })

  it('falls back to the legacy endpoint when PA errors (e.g. 429)', async () => {
    const spy = vi.fn((url: string) => {
      if (url.includes('translate-pa')) return { ok: false, status: 429, json: null }
      expect(url).toContain('/translate_a/single')
      return { json: [[['Hello '], ['world']], null, 'es'] }
    })
    mockFetch(spy)
    const r = await translate('Hola mundo', 'en')
    expect(r).toEqual({ from: 'Spanish', to: 'English', source: 'Hola mundo', translation: 'Hello world' })
    expect(spy).toHaveBeenCalledTimes(2) // PA then legacy
  })

  it('falls back when PA returns an unexpected shape', async () => {
    const spy = vi.fn((url: string) => {
      if (url.includes('translate-pa')) return { json: { notTranslation: true } }
      return { json: [[['ok']], null, 'fr'] }
    })
    mockFetch(spy)
    const r = await translate('bonjour', 'en')
    expect(r.translation).toBe('ok')
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('defaults detected language to auto when PA omits sourceLanguage', async () => {
    mockFetch(() => ({ json: { translation: 'hi' } }))
    const r = await translate('salut', 'en')
    expect(r.from).toBe(langName('auto'))
    expect(r.translation).toBe('hi')
  })

  it('defaults detected language to auto when the legacy response omits it', async () => {
    mockFetch((url) => {
      if (url.includes('translate-pa')) return { ok: false, status: 429, json: null }
      return { json: [[['hi']]] }
    })
    const r = await translate('salut', 'en')
    expect(r.from).toBe(langName('auto'))
  })

  it('throws when both PA and the legacy fallback fail', async () => {
    mockFetch(() => ({ ok: false, status: 500, json: null }))
    await expect(translate('x', 'en')).rejects.toThrow(/Translate failed \(500\)/)
  })

  it('traces which API is used in dev mode', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    mockFetch(() => ({ json: { translation: 'hi', sourceLanguage: 'en' } }))
    await translate('hi', 'en')
    expect(info).toHaveBeenCalledWith('[translate] via translate-pa (keyed)')
    info.mockRestore()
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
