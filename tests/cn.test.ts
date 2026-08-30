import { describe, it, expect } from 'vitest'
import { cn } from '../src/lib/cn'

describe('cn', () => {
  it('joins truthy class values and drops falsy ones', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
  it('last conflicting tailwind utility wins', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
