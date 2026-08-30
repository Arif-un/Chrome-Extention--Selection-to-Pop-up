import { describe, it, expect } from 'vitest'
import { actionTokens, MORE } from '../src/lib/actions'
import { move } from '../src/lib/arr'
import type { CustomAction, AiAction } from '../src/lib/types'
import type { AiTarget } from '../src/lib/ai-targets'

const custom = (id: string): CustomAction => ({
  id,
  name: id,
  type: 'url',
  template: 'https://x/?q=%s',
  enabled: true,
})

const ai = (target: AiTarget): AiAction => ({
  target,
  label: target,
  enabled: true,
  template: '{selection}',
  mode: 'tab',
  window: {
    w: 460,
    h: 640,
    x: null,
    y: null,
    bg: '#000',
    bgOpacity: 1,
    radius: 12,
    border: true,
    borderColor: '#333',
    shadow: true,
  },
})

describe('actionTokens', () => {
  it('appends missing built-ins and custom before the divider, keeping stored order', () => {
    const out = actionTokens(['translate', MORE, 'search'], [custom('a')])
    expect(out.indexOf(MORE)).toBeGreaterThan(-1)
    // stored bar/menu split preserved: translate before MORE, search after
    expect(out.indexOf('translate')).toBeLessThan(out.indexOf(MORE))
    expect(out.indexOf('search')).toBeGreaterThan(out.indexOf(MORE))
    // missing ones (copy, dictionary, currency, custom:a) land before the divider
    for (const t of ['copy', 'dictionary', 'currency', 'custom:a'])
      expect(out.indexOf(t)).toBeLessThan(out.indexOf(MORE))
  })

  it('drops stale tokens and guarantees exactly one divider', () => {
    const out = actionTokens(['search', 'custom:gone', MORE, MORE], [])
    expect(out).not.toContain('custom:gone')
    expect(out.filter((t) => t === MORE)).toHaveLength(1)
  })

  it('adds a divider when the stored order lacks one', () => {
    expect(actionTokens(['search'], [])).toContain(MORE)
  })

  it('handles an undefined stored order (all built-ins before the divider)', () => {
    const out = actionTokens(undefined, [])
    expect(out.filter((t) => t === MORE)).toHaveLength(1)
    expect(out.indexOf(MORE)).toBe(out.length - 1) // built-ins all precede it
  })

  it('appends AI tokens before the divider and keeps their stored position', () => {
    // new AI action lands before MORE
    const fresh = actionTokens(['search', MORE], [], [ai('chatgpt')])
    expect(fresh.indexOf('ai:chatgpt')).toBeLessThan(fresh.indexOf(MORE))
    // an AI token stored after MORE (overflow) stays there; stale AI tokens drop
    const kept = actionTokens(['search', MORE, 'ai:claude', 'ai:gone'], [], [ai('claude')])
    expect(kept.indexOf('ai:claude')).toBeGreaterThan(kept.indexOf(MORE))
    expect(kept).not.toContain('ai:gone')
  })
})

describe('move', () => {
  it('moves an item across the divider', () => {
    expect(move(['a', MORE, 'b'], 0, 1)).toEqual([MORE, 'a', 'b'])
  })
})
