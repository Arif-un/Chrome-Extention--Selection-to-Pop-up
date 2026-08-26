import { describe, it, expect } from 'vitest'
import { pickEndpoints, handleColor, bulbSize, sameGeom, DEFAULT_HANDLES } from '../src/lib/handles'

const rect = (left: number, right: number, top: number, height: number) =>
  ({ left, right, top, height }) as DOMRect

describe('pickEndpoints', () => {
  it('returns null when there are no real rects', () => {
    expect(pickEndpoints([])).toBeNull()
    expect(pickEndpoints([rect(0, 0, 0, 0)])).toBeNull()
  })

  it('takes the first rect start and last rect end across wrapped lines', () => {
    const g = pickEndpoints([rect(10, 90, 0, 16), rect(0, 50, 16, 16)])
    expect(g).toEqual({
      start: { x: 10, top: 0, height: 16 },
      end: { x: 50, top: 16, height: 16 },
    })
  })

  it('skips zero-height rects (empty lines)', () => {
    const g = pickEndpoints([rect(10, 90, 0, 16), rect(0, 0, 8, 0), rect(0, 50, 16, 16)])
    expect(g?.end).toEqual({ x: 50, top: 16, height: 16 })
  })
})

describe('sameGeom', () => {
  const g = { start: { x: 1, top: 2, height: 16 }, end: { x: 3, top: 4, height: 16 } }

  it('treats two nulls as equal (idle scroll must not re-render)', () => {
    expect(sameGeom(null, null)).toBe(true)
  })

  it('treats null vs geometry as different', () => {
    expect(sameGeom(null, g)).toBe(false)
    expect(sameGeom(g, null)).toBe(false)
  })

  it('is true for identical values (skip emit)', () => {
    expect(sameGeom(g, { start: { ...g.start }, end: { ...g.end } })).toBe(true)
  })

  it('is false when any endpoint coordinate moves', () => {
    expect(sameGeom(g, { start: { ...g.start, x: 9 }, end: { ...g.end } })).toBe(false)
    expect(sameGeom(g, { start: { ...g.start }, end: { ...g.end, top: 9 } })).toBe(false)
  })
})

describe('handle style helpers', () => {
  it('folds opacity into an rgba color', () => {
    expect(handleColor({ ...DEFAULT_HANDLES, color: '#1a73e8', opacity: 0.5 })).toBe(
      'rgba(26, 115, 232, 0.5)',
    )
  })

  it('scales the bulb by size', () => {
    expect(bulbSize({ ...DEFAULT_HANDLES, size: 1 })).toBe(14)
    expect(bulbSize({ ...DEFAULT_HANDLES, size: 2 })).toBe(28)
  })
})
