import type { CurrencyResult } from '../lib/messages'
import { isSupportedCurrency, isFrankfurterCurrency } from '../lib/langs'

const SYMBOLS: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
  '₩': 'KRW',
}

/** Parse "100 USD", "USD 100", "$100", or "100" from a selection. */
export function parseAmount(
  text: string,
  fallbackBase: string,
): { amount: number; base: string } | null {
  const t = text.trim()

  let base = fallbackBase
  let anchor = -1
  // Scan all 3-letter runs and take the first SUPPORTED one so a leading word
  // (e.g. "Price: USD 100" -> "PRI") can't mask the real ISO code.
  const upper = t.toUpperCase()
  const code = upper.match(/[A-Z]{3}/g)?.find(isSupportedCurrency)
  const symbol = Object.keys(SYMBOLS).find((s) => t.includes(s))
  if (code) {
    base = code
    anchor = upper.indexOf(code)
  } else if (symbol) {
    base = SYMBOLS[symbol]
    anchor = t.indexOf(symbol)
  }

  // Collect number tokens (a space/underscore between digits, e.g. "1 000", is a
  // thousands separator, so keep it inside one token).
  const tokens = [...t.matchAll(/-?\d[\d.,]*(?:[ _]\d[\d.,]*)*/g)]
  if (!tokens.length) return null
  // Prefer the number nearest the currency indicator so a stray leading number
  // ("iPhone 15 costs $999" -> 999) can't beat the priced amount.
  const dist = (m: RegExpMatchArray) => Math.abs((m.index ?? 0) - anchor)
  const chosen =
    anchor < 0 ? tokens[0] : tokens.reduce((best, m) => (dist(m) < dist(best) ? m : best))
  const rawTok = chosen[0]
  const spaceGrouped = /\d[ _]\d/.test(rawTok)
  const amount = parseFloat(normalizeNumber(rawTok.replace(/[ _]/g, ''), spaceGrouped))
  if (!Number.isFinite(amount)) return null

  return { amount, base }
}

/**
 * Best-effort decimal-separator disambiguation. When both ',' and '.' appear the
 * last-occurring one is the decimal separator (so "1.234,56" -> 1234.56 and
 * "1,234.56" -> 1234.56). With only a comma we can't tell decimal from thousands
 * without locale info, so keep the US default of stripping it as a grouping mark.
 */
function normalizeNumber(s: string, spaceGrouped = false): string {
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    const decimal = lastComma > lastDot ? ',' : '.'
    const thousands = decimal === ',' ? '.' : ','
    return s.split(thousands).join('').replace(decimal, '.')
  }
  // Comma-only: when spaces already grouped the thousands (e.g. "1 000,50") the
  // comma is the decimal; otherwise keep the US default of stripping it as grouping.
  if (lastComma > -1) return spaceGrouped ? s.replace(',', '.') : s.split(',').join('')
  return s
}

/**
 * Convert a selection. `baseOverride`/`target` win over what's detected in the
 * text; otherwise the source is auto-detected (code or symbol) from `text` and
 * the target falls back to settings.
 */
export async function convert(
  text: string,
  fallbackBase: string,
  target: string,
  baseOverride?: string,
): Promise<CurrencyResult> {
  const parsed = parseAmount(text, fallbackBase)
  if (!parsed) throw new Error('No amount found in selection')
  const amount = parsed.amount
  const base = (baseOverride ?? parsed.base).toUpperCase()
  target = target.toUpperCase()

  if (base === target) {
    return { amount, from: base, to: target, rate: 1, converted: amount, date: '' }
  }
  if (!isSupportedCurrency(base) || !isSupportedCurrency(target)) {
    throw new Error(`Unsupported currency: ${!isSupportedCurrency(base) ? base : target}`)
  }

  // frankfurter (ECB) only when both sides are in its set; else er-api fallback.
  const { rate, date } =
    isFrankfurterCurrency(base) && isFrankfurterCurrency(target)
      ? await frankfurter(base, target)
      : await erApi(base, target)

  return { amount, from: base, to: target, rate, converted: amount * rate, date }
}

async function frankfurter(base: string, target: string): Promise<{ rate: number; date: string }> {
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${target}`)
  if (!res.ok) throw new Error(`Currency failed (${res.status})`)
  const data = (await res.json()) as { date: string; rates: Record<string, number> }
  const rate = data.rates?.[target]
  if (typeof rate !== 'number') throw new Error('Rate unavailable')
  return { rate, date: data.date ?? '' }
}

async function erApi(base: string, target: string): Promise<{ rate: number; date: string }> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`)
  if (!res.ok) throw new Error(`Currency failed (${res.status})`)
  const data = (await res.json()) as {
    result: string
    rates: Record<string, number>
    time_last_update_utc?: string
  }
  const rate = data.rates?.[target]
  if (data.result !== 'success' || typeof rate !== 'number') throw new Error('Rate unavailable')
  const date = data.time_last_update_utc ? data.time_last_update_utc.slice(0, 16) : ''
  return { rate, date }
}
