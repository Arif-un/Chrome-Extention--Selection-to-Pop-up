import { describe, it, expect } from 'vitest'
import { pickSearchEngine } from '../src/lib/search'
import type { SearchEngine } from '../src/lib/types'

const eng = (id: string, enabled = true): SearchEngine => ({
  id,
  name: id,
  url: `https://${id}/?q=%s`,
  enabled,
})

describe('pickSearchEngine', () => {
  const engines = [eng('google'), eng('bing', false), eng('ddg')]

  it('returns the requested engine when it exists', () => {
    expect(pickSearchEngine(engines, 'google', 'ddg')?.id).toBe('ddg')
  })

  it('falls back to the default when the requested id is unknown', () => {
    expect(pickSearchEngine(engines, 'google', 'nope')?.id).toBe('google')
  })

  it('uses the default engine when none requested', () => {
    expect(pickSearchEngine(engines, 'ddg')?.id).toBe('ddg')
  })

  it('falls back to the first enabled engine when the default is missing', () => {
    expect(pickSearchEngine([eng('a', false), eng('b')], 'gone')?.id).toBe('b')
  })

  it('falls back to the first engine when none are enabled', () => {
    expect(pickSearchEngine([eng('a', false), eng('b', false)], 'gone')?.id).toBe('a')
  })

  it('returns undefined for an empty list', () => {
    expect(pickSearchEngine([], 'x')).toBeUndefined()
  })

  it('returns a disabled engine if explicitly requested', () => {
    expect(pickSearchEngine(engines, 'google', 'bing')?.id).toBe('bing')
  })
})
