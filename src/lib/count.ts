export interface CountResult {
  /** whitespace-separated tokens */
  words: number
  /** unicode letters only (excludes spaces, punctuation, digits) */
  letters: number
  /** total characters incl. spaces (code points, so emoji count as one) */
  chars: number
  /** characters excluding all whitespace */
  charsNoSpaces: number
  lines: number
  /** rough heuristic: runs ended by . ! ? (or the whole text if none) */
  sentences: number
}

/** Count words, letters, characters, lines and sentences in the given text. */
export function countText(text: string): CountResult {
  const cps = [...text]
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const letters = (text.match(/\p{L}/gu) ?? []).length
  const charsNoSpaces = cps.filter((c) => !/\s/u.test(c)).length
  const lines = text ? text.split(/\r\n|\r|\n/).length : 0
  const enders = (text.match(/[.!?]+/g) ?? []).length
  const sentences = enders > 0 ? enders : text.trim() ? 1 : 0
  return { words, letters, chars: cps.length, charsNoSpaces, lines, sentences }
}
