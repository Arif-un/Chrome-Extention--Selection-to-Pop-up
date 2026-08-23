import { describe, it, expect } from 'vitest'
import { parseAmount } from '../src/services/currency'

describe('parseAmount', () => {
  it('parses "100 USD"', () => {
    expect(parseAmount('100 USD', 'EUR')).toEqual({ amount: 100, base: 'USD' })
  })
  it('parses "USD 100"', () => {
    expect(parseAmount('USD 100', 'EUR')).toEqual({ amount: 100, base: 'USD' })
  })
  it('parses a currency symbol', () => {
    expect(parseAmount('€49.99', 'USD')).toEqual({ amount: 49.99, base: 'EUR' })
  })
  it('handles thousands separators', () => {
    expect(parseAmount('1,250 GBP', 'USD')).toEqual({ amount: 1250, base: 'GBP' })
  })
  it('falls back to the default base when no currency is present', () => {
    expect(parseAmount('42', 'JPY')).toEqual({ amount: 42, base: 'JPY' })
  })
  it('detects BDT (served via the er-api fallback)', () => {
    expect(parseAmount('100 BDT', 'USD')).toEqual({ amount: 100, base: 'BDT' })
  })
  it('ignores unsupported currency codes and uses fallback', () => {
    expect(parseAmount('100 XYZ', 'USD')).toEqual({ amount: 100, base: 'USD' })
  })
  it('returns null with no number', () => {
    expect(parseAmount('hello', 'USD')).toBeNull()
  })
})
