import { describe, it, expect } from 'vitest'
import { appearanceStyle, DEFAULT_APPEARANCE, PRESETS } from '../src/lib/appearance'

describe('appearanceStyle', () => {
  it('renders bg as rgba from hex + opacity', () => {
    const s = appearanceStyle({ ...DEFAULT_APPEARANCE, bg: '#1e293b', bgOpacity: 0.5 })
    expect(s['--stp-bg']).toBe('rgba(30, 41, 59, 0.5)')
  })

  it('expands 3-digit shorthand hex', () => {
    const s = appearanceStyle({ ...DEFAULT_APPEARANCE, bg: '#abc', bgOpacity: 1 })
    expect(s['--stp-bg']).toBe('rgba(170, 187, 204, 1)')
  })

  it('turns blur off when 0 and sets both prefixes when on', () => {
    expect(appearanceStyle({ ...DEFAULT_APPEARANCE, blur: 0 }).backdropFilter).toBe('none')
    const on = appearanceStyle({ ...DEFAULT_APPEARANCE, blur: 12 })
    expect(on.backdropFilter).toBe('blur(12px)')
    expect(on.WebkitBackdropFilter).toBe('blur(12px)')
  })

  it('keeps inner radius concentric and non-negative', () => {
    expect(appearanceStyle({ ...DEFAULT_APPEARANCE, radius: 8 })['--stp-radius-inner']).toBe('4px')
    expect(appearanceStyle({ ...DEFAULT_APPEARANCE, radius: 2 })['--stp-radius-inner']).toBe('0px')
  })

  it('drops border and shadow when disabled', () => {
    const s = appearanceStyle({ ...DEFAULT_APPEARANCE, border: false, shadow: false })
    expect(s['--stp-border']).toBe('none')
    expect(s['--stp-shadow']).toBe('none')
  })

  it('scale becomes zoom', () => {
    expect(appearanceStyle({ ...DEFAULT_APPEARANCE, scale: 1.4 }).zoom).toBe('1.4')
  })
})

describe('presets', () => {
  it('default appearance matches the dark preset style fields', () => {
    expect(DEFAULT_APPEARANCE).toMatchObject(PRESETS.dark)
  })
})
