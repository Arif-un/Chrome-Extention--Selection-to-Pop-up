import { hexToRgba } from './appearance'

/** Style config for the mobile-style draggable selection handles. */
export interface SelectionHandles {
  enabled: boolean
  color: string // hex
  opacity: number // 0..1
  thickness: number // bar width in px
  size: number // scale for bar length + bulb radius (0.5..2)
}

export const DEFAULT_HANDLES: SelectionHandles = {
  enabled: true,
  color: '#1a73e8', // mobile system-blue
  opacity: 0.4,
  thickness: 2,
  size: 1.1,
}

/** Bulb diameter in px at size = 1. */
export const BULB_BASE = 14

export function handleColor(h: SelectionHandles): string {
  return hexToRgba(h.color, h.opacity)
}

export function bulbSize(h: SelectionHandles): number {
  return Math.round(BULB_BASE * h.size)
}

export type EndRect = { x: number; top: number; height: number }
export type SelGeom = { start: EndRect; end: EndRect }

/** Value-equality for two endpoint geometries (null-safe). Lets callers skip
 * re-renders when the selection has not actually moved. */
export function sameGeom(a: SelGeom | null, b: SelGeom | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.start.x === b.start.x &&
    a.start.top === b.start.top &&
    a.start.height === b.start.height &&
    a.end.x === b.end.x &&
    a.end.top === b.end.top &&
    a.end.height === b.end.height
  )
}

/**
 * First and last client rects of a selection become its start/end endpoints.
 * Pure so it is unit-testable without layout. Skips zero-area rects (empty
 * lines) so a wrapped selection anchors to real glyphs.
 */
export function pickEndpoints(rects: DOMRect[]): SelGeom | null {
  const real = rects.filter((r) => r.height > 0)
  if (real.length === 0) return null
  const first = real[0]
  const last = real[real.length - 1]
  return {
    start: { x: first.left, top: first.top, height: first.height },
    end: { x: last.right, top: last.top, height: last.height },
  }
}
