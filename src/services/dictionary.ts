import type { DictionaryResult, DictionarySense } from '../lib/messages'

interface ApiSense {
  definition?: string
  examples?: string[]
  synonyms?: string[]
}
interface ApiEntry {
  language?: { code?: string; name?: string }
  partOfSpeech?: string
  pronunciations?: { type?: string; text?: string }[]
  senses?: ApiSense[]
  synonyms?: string[]
}
interface ApiResponse {
  word?: string
  entries?: ApiEntry[]
}

/** Look up a word via freedictionaryapi.com (multi-language, no key). */
export async function lookup(word: string, lang: string): Promise<DictionaryResult> {
  const clean = word.trim().split(/\s+/)[0] // dictionaries take single words
  const url = `https://freedictionaryapi.com/api/v1/entries/${encodeURIComponent(
    lang,
  )}/${encodeURIComponent(clean)}`

  const res = await fetch(url)
  if (res.status === 404) throw new Error(`No definition found for "${clean}"`)
  if (!res.ok) throw new Error(`Dictionary failed (${res.status})`)
  const data = (await res.json()) as ApiResponse

  const entries = data.entries ?? []
  if (!entries.length) throw new Error(`No definition found for "${clean}"`)

  const phonetic = entries
    .flatMap((e) => e.pronunciations ?? [])
    .find((p) => p.type === 'ipa' && p.text)?.text

  const senses: DictionarySense[] = entries
    .flatMap((e) =>
      (e.senses ?? []).slice(0, 3).map((s) => ({
        partOfSpeech: e.partOfSpeech ?? '',
        definition: s.definition ?? '',
        example: s.examples?.[0],
        synonyms: (s.synonyms ?? []).concat(e.synonyms ?? []).slice(0, 6),
      })),
    )
    .filter((s) => s.definition)
    .slice(0, 6)

  return {
    word: data.word ?? clean,
    language: entries[0]?.language?.name ?? lang,
    phonetic,
    senses,
  }
}
