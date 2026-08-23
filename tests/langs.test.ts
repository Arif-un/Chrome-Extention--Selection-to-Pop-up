import { describe, it, expect } from 'vitest'
import {
  langName,
  isSupportedCurrency,
  isFrankfurterCurrency,
  CURRENCIES,
  FRANKFURTER_CURRENCIES,
} from '../src/lib/langs'

describe('langName', () => {
  it('maps a known code to its name', () => {
    expect(langName('fr')).toBe('French')
    expect(langName('zh-CN')).toBe('Chinese (Simplified)')
  })
  it('returns the code itself when unknown', () => {
    expect(langName('auto')).toBe('auto')
    expect(langName('xx')).toBe('xx')
  })
})

describe('currency helpers', () => {
  it('isSupportedCurrency is case-insensitive', () => {
    expect(isSupportedCurrency('usd')).toBe(true)
    expect(isSupportedCurrency('BDT')).toBe(true)
    expect(isSupportedCurrency('XYZ')).toBe(false)
  })
  it('isFrankfurterCurrency only matches the ECB set', () => {
    expect(isFrankfurterCurrency('EUR')).toBe(true)
    expect(isFrankfurterCurrency('bdt')).toBe(false) // supported, but er-api only
  })
  it('every frankfurter currency is also a supported UI currency', () => {
    for (const c of FRANKFURTER_CURRENCIES) expect(CURRENCIES).toContain(c)
  })
  it('CURRENCIES is sorted and free of duplicates', () => {
    const sorted = [...CURRENCIES].sort()
    expect(CURRENCIES).toEqual(sorted)
    expect(new Set(CURRENCIES).size).toBe(CURRENCIES.length)
  })
})
