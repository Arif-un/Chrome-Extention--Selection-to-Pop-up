import { describe, it, expect } from 'vitest'
import { googleTranslateUrl } from '../src/lib/translate-url'

describe('googleTranslateUrl', () => {
  it('builds the translate URL with encoded text and target lang', () => {
    expect(googleTranslateUrl('hello world', 'es')).toBe(
      'https://translate.google.com/?sl=auto&tl=es&text=hello%20world&op=translate',
    )
  })
  it('encodes special characters', () => {
    expect(googleTranslateUrl('a&b=c', 'fr')).toBe(
      'https://translate.google.com/?sl=auto&tl=fr&text=a%26b%3Dc&op=translate',
    )
  })
})
