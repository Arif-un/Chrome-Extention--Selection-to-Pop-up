/** Message protocol between content script, popup, and background service worker. */

export interface TranslateResult {
  from: string
  to: string
  source: string
  translation: string
}

export interface DictionarySense {
  partOfSpeech: string
  definition: string
  example?: string
  synonyms: string[]
}

export interface DictionaryResult {
  word: string
  language: string
  phonetic?: string
  senses: DictionarySense[]
}

export interface CurrencyResult {
  amount: number
  from: string
  to: string
  rate: number
  converted: number
  date: string
}

// content/popup -> background
export type Request =
  | { type: 'TRANSLATE'; text: string; targetLang?: string }
  | { type: 'DICTIONARY'; word: string }
  | { type: 'CURRENCY'; text: string; base?: string; target?: string }

// background -> content
export type Command =
  | { type: 'TRIGGER_SELECTION' }
  | { type: 'PERFORM_ACTION'; action: string; text?: string }

export type Ok<T> = { ok: true; data: T }
export type Err = { ok: false; error: string }
export type Response<T> = Ok<T> | Err

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data }
}
export function err(error: string): Err {
  return { ok: false, error }
}
