import { describe, it, expect } from 'vitest'
import { resolveDark } from '../src/lib/theme'

describe('resolveDark', () => {
  it('forces dark/light regardless of system', () => {
    expect(resolveDark('dark', false)).toBe(true)
    expect(resolveDark('light', true)).toBe(false)
  })

  it('follows system preference when set to system', () => {
    expect(resolveDark('system', true)).toBe(true)
    expect(resolveDark('system', false)).toBe(false)
  })
})
