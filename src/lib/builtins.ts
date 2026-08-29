import type { BuiltinKey } from './types'

export type { BuiltinKey }

/** Single source of truth for built-in action labels (menu, popup, options, tooltip). */
export const BUILTIN_LABELS: Record<BuiltinKey, string> = {
  search: 'Search',
  copy: 'Copy',
  translate: 'Translate',
  dictionary: 'Dictionary',
  currency: 'Currency',
}

export const BUILTIN_KEYS = Object.keys(BUILTIN_LABELS) as BuiltinKey[]
