import { describe, it, expect } from 'vitest'
import { deepMerge, migrateLegacy } from '../src/lib/settings'
import { DEFAULT_SETTINGS } from '../src/lib/defaults'

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
