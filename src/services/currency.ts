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
  const num = t.replace(/[,_\s]/g, '').match(/-?\d+(\.\d+)?/)
  if (!num) return null
  const amount = parseFloat(num[0])
  if (!Number.isFinite(amount)) return null

  let base = fallbackBase
  const code = t.match(/[A-Za-z]{3}/)?.[0]?.toUpperCase()
  const symbol = Object.keys(SYMBOLS).find((s) => t.includes(s))
  if (code && isSupportedCurrency(code)) base = code
  else if (symbol) base = SYMBOLS[symbol]

  return { amount, base }
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
