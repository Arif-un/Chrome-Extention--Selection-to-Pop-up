import { describe, it, expect } from 'vitest'
import { AI_PRESETS, presetIdFor } from '../src/lib/ai-presets'

describe('ai-presets', () => {
  it('includes none plus the named styles, all with {selection}', () => {
    const ids = AI_PRESETS.map((p) => p.id)
    expect(ids).toEqual([
      'none',
      'proofread',
      'rewrite',
      'concise',
      'professional',
      'human',
      'slack',
    ])
    for (const p of AI_PRESETS) expect(p.template).toContain('{selection}')
  })

  it('maps a matching template back to its preset id', () => {
    for (const p of AI_PRESETS) expect(presetIdFor(p.template)).toBe(p.id)
  })

  it('returns custom for an unknown template', () => {
    expect(presetIdFor('Do a barrel roll: {selection}')).toBe('custom')
  })
})
