import { describe, it, expect } from 'vitest'
import { updateAt, moveBefore } from '../src/lib/arr'

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

describe('moveBefore', () => {
  const l = ['a', 'b', 'c', 'd']

  it('lands the item before the drop target on a downward drag', () => {
    // drag 'a' (0) onto 'c' (2): drop line is above 'c', so 'a' goes before 'c'
    expect(moveBefore(l, 0, 2)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('lands the item before the drop target on an upward drag', () => {
    // drag 'c' (2) onto 'b' (1): 'c' goes before 'b'
    expect(moveBefore(l, 2, 1)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('drops before the last row without overshooting into it', () => {
    expect(moveBefore(l, 0, 3)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('is a no-op when dropped on itself', () => {
    expect(moveBefore(l, 1, 1)).toEqual(l)
  })

  it('does not mutate the source array', () => {
    const src = ['a', 'b', 'c']
    moveBefore(src, 0, 2)
    expect(src).toEqual(['a', 'b', 'c'])
  })
})
