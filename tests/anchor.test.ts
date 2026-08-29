import { describe, it, expect, beforeEach } from 'vitest'
import { anchorFor } from '../src/content/anchor'
import { store } from '../src/content/store'
import type { SelGeom } from '../src/lib/handles'

// anchorFor reads window.innerWidth for the x clamp; node has no window.
;(globalThis as unknown as { window: { innerWidth: number } }).window = { innerWidth: 1000 }

// Passing text + geom/cursor keeps anchorFor off the DOM (getSelectionText /
// getEndpointRects are only hit when those args are absent).
function setAnchor(anchor?: 'above' | 'below' | 'auto', offsetX = 0, offsetY = 0) {
  store.state.settings = { appearance: { anchor, offsetX, offsetY } } as never
}

const geom = (top: number, bottom: number, x = 100): SelGeom => ({
  start: { x, top, height: bottom - top },
  end: { x, top, height: bottom - top },
})

beforeEach(() => setAnchor())

describe('anchorFor — cursor branch', () => {
  it('returns null for empty text', () => {
    expect(anchorFor('', undefined, { x: 10, y: 10 })).toBeNull()
  })

  it("anchor 'above' sits above the cursor when there is room", () => {
    setAnchor('above')
    expect(anchorFor('hi', undefined, { x: 100, y: 300 })).toEqual({
      text: 'hi',
      x: 100,
      y: 300 - 44 - 6,
    })
  })

  it("anchor 'above' falls back to below near the top edge", () => {
    setAnchor('above')
    // above = 20 - 44 - 6 = -30 (< 8) -> below = 20 + 12
    expect(anchorFor('hi', undefined, { x: 100, y: 20 })?.y).toBe(32)
  })

  it("anchor 'below' (and default) sits below the cursor", () => {
    setAnchor('below')
    expect(anchorFor('hi', undefined, { x: 100, y: 300 })?.y).toBe(312)
    setAnchor(undefined) // auto/default -> below for cursor
    expect(anchorFor('hi', undefined, { x: 100, y: 300 })?.y).toBe(312)
  })

  it('falls back to defaults when appearance settings are absent', () => {
    store.state.settings = null as never
    // no appearance -> anchor auto (below for cursor), zero offsets
    expect(anchorFor('hi', undefined, { x: 100, y: 300 })).toEqual({ text: 'hi', x: 100, y: 312 })
  })

  it('clamps x within the viewport and applies offsets', () => {
    setAnchor('below', 50, 5)
    const r = anchorFor('hi', undefined, { x: 900, y: 100 })!
    expect(r.x).toBe(1000 - 320) // 900 + 50 clamped to innerWidth - TOOLTIP_W
    expect(r.y).toBe(112 + 5)
    expect(anchorFor('hi', undefined, { x: -100, y: 100 })!.x).toBe(8) // clamped low
  })
})

describe('anchorFor — geometry branch', () => {
  it("anchor 'below' sits below the selection", () => {
    setAnchor('below')
    expect(anchorFor('hi', geom(100, 120))?.y).toBe(126) // bottom + 6
  })

  it("anchor 'above' sits above the selection", () => {
    setAnchor('above')
    expect(anchorFor('hi', geom(100, 120))?.y).toBe(100 - 44 - 6) // top - 44 - 6
  })

  it('auto flips below when there is no room above', () => {
    setAnchor('auto')
    // top = 10 -> above = 10 - 44 - 6 = -40 (< 8) -> below = bottom + 6
    expect(anchorFor('hi', geom(10, 30))?.y).toBe(36)
  })

  it('falls back to defaults when appearance settings are absent', () => {
    store.state.settings = null as never
    // no appearance -> auto; top 100 -> above 50 (>= 8) wins, zero offsets
    expect(anchorFor('hi', geom(100, 120))).toEqual({ text: 'hi', x: 100, y: 50 })
  })
})
