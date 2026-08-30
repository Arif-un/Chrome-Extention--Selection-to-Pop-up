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
  it('sees the ISO code past a leading word', () => {
    expect(parseAmount('Price: USD 100', 'INR')).toEqual({ amount: 100, base: 'USD' })
  })
  it('parses European decimal-comma amounts (1.234,56)', () => {
    expect(parseAmount('1.234,56 EUR', 'USD')).toEqual({ amount: 1234.56, base: 'EUR' })
  })
  it('parses US grouped decimals (1,234.56)', () => {
    expect(parseAmount('1,234.56 USD', 'EUR')).toEqual({ amount: 1234.56, base: 'USD' })
  })
  it('treats a space as thousands grouping so the comma is the decimal (1 000,50)', () => {
    expect(parseAmount('1 000,50 EUR', 'USD')).toEqual({ amount: 1000.5, base: 'EUR' })
  })
  it('keeps space-grouped integers whole (1 000 000)', () => {
    expect(parseAmount('1 000 000 JPY', 'USD')).toEqual({ amount: 1000000, base: 'JPY' })
  })
  it('picks the amount next to the symbol past a leading number', () => {
    expect(parseAmount('iPhone 15 costs $999', 'EUR')).toEqual({ amount: 999, base: 'USD' })
  })
  it('picks the amount next to the ISO code past a leading number', () => {
    expect(parseAmount('buy 2 items for 50 USD', 'EUR')).toEqual({ amount: 50, base: 'USD' })
  })
  it('returns null with no number', () => {
    expect(parseAmount('hello', 'USD')).toBeNull()
  })
})
