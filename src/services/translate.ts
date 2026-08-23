import type { TranslateResult } from '../lib/messages'
import { langName } from '../lib/langs'

/**
 * Translate via the unofficial Google endpoint (same one the official extension
 * uses under the hood). Called from the service worker, where host_permissions
 * bypass page CSP/CORS.
 */
export async function translate(text: string, targetLang: string): Promise<TranslateResult> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      targetLang,
    )}&dt=t&q=${encodeURIComponent(text)}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Translate failed (${res.status})`)
  const data = (await res.json()) as [Array<[string]>, unknown, string]

  const segments = data[0] ?? []
  const translation = segments.map((seg) => seg[0]).join('')
  const detected = data[2] ?? 'auto'

  return {
    from: langName(detected),
    to: langName(targetLang),
    source: text,
    translation,
  }
}
