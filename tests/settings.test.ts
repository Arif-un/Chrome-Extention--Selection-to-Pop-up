import { describe, it, expect, vi, afterEach } from 'vitest'
import { deepMerge, migrateLegacy, getSettings, setSettings } from '../src/lib/settings'
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '../src/lib/defaults'

/** Stub chrome.storage.sync backed by an in-memory store seeded with `seed`. */
function stubStorage(seed: Record<string, unknown>) {
  const data = { ...seed }
  vi.stubGlobal('chrome', {
    storage: {
      sync: {
        get: vi.fn(async (keys: string[]) =>
          Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]])),
        ),
        set: vi.fn(async (patch: Record<string, unknown>) => Object.assign(data, patch)),
        remove: vi.fn(async () => {}),
      },
    },
  })
  return data
}

describe('deepMerge', () => {
  it('merges nested objects without dropping siblings', () => {
    const out = deepMerge(DEFAULT_SETTINGS, { translate: { targetLang: 'fr' } } as never)
    expect(out.translate.targetLang).toBe('fr')
    expect(out.translate.openInWindow).toBe(DEFAULT_SETTINGS.translate.openInWindow)
    expect(out.search.defaultEngineId).toBe(DEFAULT_SETTINGS.search.defaultEngineId)
  })

  it('replaces arrays wholesale', () => {
    const out = deepMerge(DEFAULT_SETTINGS, { customActions: [] })
    expect(out.customActions).toEqual([])
  })

  it('drops a stored value whose type no longer matches the default', () => {
    // scalar→object schema change: a stored string where the default is an object
    // must not overwrite the default, or new code reads the wrong type.
    const out = deepMerge(DEFAULT_SETTINGS, { search: 'oops' as never })
    expect(out.search).toEqual(DEFAULT_SETTINGS.search)
    // array-vs-scalar mismatch is rejected too
    const out2 = deepMerge(DEFAULT_SETTINGS, { customActions: 'nope' as never })
    expect(out2.customActions).toEqual(DEFAULT_SETTINGS.customActions)
  })

  it('keeps values when the default is null (type cannot be inferred)', () => {
    // AiWindow.x defaults to null but is legitimately a number once positioned.
    const positioned = DEFAULT_SETTINGS.aiActions.map((a) => ({
      ...a,
      window: { ...a.window, x: 120, y: 80 },
    }))
    const out = deepMerge(DEFAULT_SETTINGS, { aiActions: positioned })
    expect(out.aiActions[0].window.x).toBe(120)
  })
})

describe('migrateLegacy', () => {
  it('maps v1 keys to the new schema', () => {
    const patch = migrateLegacy({ primaryTranslate: 'es', primaryCurrency: 'EUR', pop_win: true })
    expect(patch.translate?.targetLang).toBe('es')
    expect(patch.translate?.openInWindow).toBe(true)
    expect(patch.currency?.target).toBe('EUR')
  })

  it('keeps supported legacy currencies (BDT now via er-api fallback)', () => {
    const patch = migrateLegacy({ primaryCurrency: 'BDT' })
    expect(patch.currency?.target).toBe('BDT')
  })

  it('drops unsupported legacy currencies', () => {
    const patch = migrateLegacy({ primaryCurrency: 'XYZ' })
    expect(patch.currency).toBeUndefined()
  })

  it('is empty when there is nothing to migrate', () => {
    expect(migrateLegacy({})).toEqual({})
  })
})

describe('getSettings schema migration', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does not resurrect a default engine the user deleted on an old schema', async () => {
    // v1.x-era install (schema 3) where the user removed DuckDuckGo.
    stubStorage({
      settings: {
        ...DEFAULT_SETTINGS,
        schema: 3,
        search: {
          ...DEFAULT_SETTINGS.search,
          engines: DEFAULT_SETTINGS.search.engines.filter((e) => e.id !== 'ddg'),
        },
      },
    })
    const s = await getSettings()
    expect(s.schema).toBe(SCHEMA_VERSION)
    expect(s.search.engines.some((e) => e.id === 'ddg')).toBe(false)
  })

  it('preserves user aiActions and does not resurrect a deleted one on migration', async () => {
    // Old schema install where the user removed the Grok AI action and disabled Claude.
    stubStorage({
      settings: {
        ...DEFAULT_SETTINGS,
        schema: 3,
        aiActions: DEFAULT_SETTINGS.aiActions
          .filter((a) => a.target !== 'grok')
          .map((a) => (a.target === 'claude' ? { ...a, enabled: false } : a)),
      },
    })
    const s = await getSettings()
    expect(s.schema).toBe(SCHEMA_VERSION)
    // deleted one stays deleted (no default in AI_ACTION_SINCE post-dates schema 3)
    expect(s.aiActions.some((a) => a.target === 'grok')).toBe(false)
    // user edits on kept actions survive migration
    expect(s.aiActions.find((a) => a.target === 'claude')?.enabled).toBe(false)
  })

  it('adds engines introduced after the stored schema', async () => {
    // schema 3 predates google-ai/deepseek (since 9), so they should appear.
    stubStorage({
      settings: {
        ...DEFAULT_SETTINGS,
        schema: 3,
        search: {
          ...DEFAULT_SETTINGS.search,
          engines: [{ id: 'google', name: 'Google', url: 'https://x/?q=%s', enabled: true }],
        },
      },
    })
    const s = await getSettings()
    expect(s.search.engines.some((e) => e.id === 'google-ai')).toBe(true)
    expect(s.search.engines.some((e) => e.id === 'deepseek')).toBe(true)
  })
})

describe('setSettings concurrency', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('serializes concurrent writes so neither update is clobbered', async () => {
    stubStorage({ settings: { ...DEFAULT_SETTINGS } })
    // Fire two writes without awaiting between them. Without serialization both
    // read the same `current` and the second overwrites the first's change.
    const a = setSettings({ moreMenu: false })
    const b = setSettings({ trigger: { onSelection: false } })
    await Promise.all([a, b])
    const final = await getSettings()
    expect(final.moreMenu).toBe(false)
    expect(final.trigger.onSelection).toBe(false)
  })
})
