import { describe, it, expect } from 'vitest'
import {
  AI_TARGETS,
  AI_DOMAINS,
  AI_HASH_KEY,
  aiTarget,
  renderPrompt,
  surfaceUrl,
  promptFromHash,
  targetForHost,
} from '../src/lib/ai-targets'

describe('renderPrompt', () => {
  it('substitutes every placeholder form', () => {
    expect(renderPrompt('a {selection} b', 'X')).toBe('a X b')
    expect(renderPrompt('a {text} b', 'X')).toBe('a X b')
    expect(renderPrompt('a %s b', 'X')).toBe('a X b')
  })
  it('replaces all occurrences', () => {
    expect(renderPrompt('{selection}-{selection}', 'X')).toBe('X-X')
  })
  it('does not treat $ in the selection as a replacement token', () => {
    expect(renderPrompt('q: {selection}', '$1 & $&')).toBe('q: $1 & $&')
  })
  it('falls back to the raw selection when the template is empty', () => {
    expect(renderPrompt('', 'hello')).toBe('hello')
  })
})

describe('surfaceUrl', () => {
  it('uses the query param (auto-submit) when supported', () => {
    const chatgpt = aiTarget('chatgpt')!
    expect(surfaceUrl(chatgpt, 'hi there')).toBe('https://chatgpt.com/?q=hi%20there')
  })
  it('carries the prompt in the hash for query-less targets', () => {
    const gemini = aiTarget('gemini')!
    const url = surfaceUrl(gemini, 'hi there')
    expect(url).toBe(`https://gemini.google.com/app#${AI_HASH_KEY}=hi%20there`)
    expect(promptFromHash(new URL(url).hash)).toBe('hi there')
  })
})

describe('promptFromHash', () => {
  it('returns null when no prompt is present', () => {
    expect(promptFromHash('#other=1')).toBeNull()
    expect(promptFromHash('')).toBeNull()
  })
  it('round-trips an encoded prompt', () => {
    expect(promptFromHash(`#${AI_HASH_KEY}=a%20%26%20b`)).toBe('a & b')
  })
  it('returns null on a malformed percent-escape instead of throwing', () => {
    // The hash is attacker-craftable; decodeURIComponent would throw on a lone `%`.
    expect(promptFromHash(`#${AI_HASH_KEY}=%`)).toBeNull()
    expect(promptFromHash(`#${AI_HASH_KEY}=%zz`)).toBeNull()
  })
})

describe('targetForHost', () => {
  it('matches exact and subdomain hosts', () => {
    expect(targetForHost('chatgpt.com')?.key).toBe('chatgpt')
    expect(targetForHost('chat.openai.com')?.key).toBe('chatgpt')
    expect(targetForHost('foo.claude.ai')?.key).toBe('claude')
  })
  it('returns undefined for unknown hosts', () => {
    expect(targetForHost('example.com')).toBeUndefined()
  })
})

describe('AI_TARGETS registry', () => {
  it('has stable ids equal to their keys and non-empty inject selectors', () => {
    for (const t of AI_TARGETS) {
      expect(aiTarget(t.key)).toBe(t)
      expect(t.inject.input.length).toBeGreaterThan(0)
    }
  })
  it('AI_DOMAINS lists every target domain', () => {
    for (const t of AI_TARGETS) for (const d of t.domains) expect(AI_DOMAINS).toContain(d)
  })
})
