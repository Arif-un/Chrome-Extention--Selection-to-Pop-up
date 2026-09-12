import type { TranslateResult } from '../lib/messages'
import { langName } from '../lib/langs'

/**
 * Translate via Google. Primary path is the keyed One Platform endpoint
 * (`translate-pa.googleapis.com/v1/translate`) that the official Google
 * Translate extension uses — it bills against a project quota instead of the
 * anonymous per-IP throttle, so it doesn't hand out 429s under normal use. On
 * any failure we fall back to the legacy anonymous `translate_a/single`
 * endpoint. Both are reached from the service worker, where CORS/host perms
 * bypass page restrictions.
 */

// Key shipped in the official Google Translate extension. The PA endpoint
// reflects the caller's chrome-extension origin in Access-Control-Allow-Origin,
// so no host permission is required.
const PA_KEY = 'AIzaSyDLEeFI5OtFBwYBIoK_jj5m32rZK5CkCXA'

const trace = (api: string) => {
  if (import.meta.env.DEV) console.info(`[translate] via ${api}`)
}

export async function translate(text: string, targetLang: string): Promise<TranslateResult> {
  try {
    return await translatePA(text, targetLang)
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[translate] PA failed, falling back to legacy', err)
    return await translateLegacy(text, targetLang)
  }
}

async function translatePA(text: string, targetLang: string): Promise<TranslateResult> {
  const url =
    `https://translate-pa.googleapis.com/v1/translate?params.client=gtx` +
    `&query.source_language=auto&query.target_language=${encodeURIComponent(targetLang)}` +
    `&query.text=${encodeURIComponent(text)}&key=${PA_KEY}&data_types=TRANSLATION`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Translate PA failed (${res.status})`)
  const data = (await res.json()) as { translation?: unknown; sourceLanguage?: unknown }
  if (typeof data.translation !== 'string') throw new Error('Translate PA: unexpected response')

  trace('translate-pa (keyed)')
  return {
    from: langName(typeof data.sourceLanguage === 'string' ? data.sourceLanguage : 'auto'),
    to: langName(targetLang),
    source: text,
    translation: data.translation,
  }
}

async function translateLegacy(text: string, targetLang: string): Promise<TranslateResult> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
    targetLang,
  )}&dt=t&q=${encodeURIComponent(text)}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Translate failed (${res.status})`)
  const data = (await res.json()) as [Array<[string]>, unknown, string]

  const segments = data[0] ?? []
  const translation = segments.map((seg) => seg[0]).join('')
  const detected = data[2] ?? 'auto'

  trace('translate_a/single (anon fallback)')
  return {
    from: langName(detected),
    to: langName(targetLang),
    source: text,
    translation,
  }
}
