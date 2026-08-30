import { describe, it, expect } from 'vitest'
import { BUILTIN_KEYS, BUILTIN_LABELS } from '../src/lib/builtins'

describe('builtins', () => {
  it('exposes every builtin key with a label', () => {
    expect(BUILTIN_KEYS).toEqual(['search', 'copy', 'translate', 'dictionary', 'currency', 'count'])
  })

  it('derives keys from the label map', () => {
    expect(BUILTIN_KEYS).toEqual(Object.keys(BUILTIN_LABELS))
    for (const k of BUILTIN_KEYS) expect(BUILTIN_LABELS[k]).toBeTruthy()
  })
})
