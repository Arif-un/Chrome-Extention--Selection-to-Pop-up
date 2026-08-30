import { describe, it, expect } from 'vitest'
import { countText } from '../src/lib/count'

describe('countText', () => {
  it('counts a simple sentence', () => {
    expect(countText('Hello world.')).toEqual({
      words: 2,
      letters: 10,
      chars: 12,
      charsNoSpaces: 11,
      lines: 1,
      sentences: 1,
    })
  })

  it('returns zeros for empty text', () => {
    expect(countText('')).toEqual({
      words: 0,
      letters: 0,
      chars: 0,
      charsNoSpaces: 0,
      lines: 0,
      sentences: 0,
    })
  })

  it('ignores surrounding whitespace for word count and collapses runs', () => {
    const r = countText('  foo   bar  ')
    expect(r.words).toBe(2)
  })

  it('counts multiple lines and sentences', () => {
    const r = countText('One line.\nTwo lines! Three?')
    expect(r.lines).toBe(2)
    expect(r.sentences).toBe(3)
  })

  it('treats text with no terminator as one sentence', () => {
    expect(countText('no ending punctuation').sentences).toBe(1)
  })

  it('counts unicode letters and code-point chars, excluding punctuation/digits', () => {
    const r = countText('café 42 🙂')
    expect(r.letters).toBe(4) // c a f é
    expect(r.chars).toBe(9) // c a f é _ 4 2 _ 🙂
    expect(r.charsNoSpaces).toBe(7)
  })
})
