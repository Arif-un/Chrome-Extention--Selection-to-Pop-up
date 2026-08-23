import { describe, it, expect } from 'vitest'
import { updateAt } from '../src/lib/arr'

describe('updateAt', () => {
  const arr = [
    { id: 'a', on: true },
    { id: 'b', on: false },
  ]

  it('merges a patch into the item at index', () => {
    expect(updateAt(arr, 1, { on: true })).toEqual([
      { id: 'a', on: true },
      { id: 'b', on: true },
    ])
  })

  it('does not mutate the source array or its items', () => {
    const out = updateAt(arr, 0, { on: false })
    expect(out).not.toBe(arr)
    expect(arr[0].on).toBe(true)
  })

  it('leaves the array unchanged for an out-of-range index', () => {
    expect(updateAt(arr, 5, { on: true })).toEqual(arr)
  })
})
