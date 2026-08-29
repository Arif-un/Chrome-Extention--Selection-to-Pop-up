import { store } from './store'
import { getEndpointRects, getSelectionText } from './selection'
import type { SelGeom } from '../lib/handles'

const TOOLTIP_H = 44 // approx button-row height for positioning
const TOOLTIP_W = 320 // approx max panel width, for clamping x within the viewport

/**
 * Where the popup should sit for the current selection. Works for both page
 * ranges and form-field selections (geometry comes from getEndpointRects).
 */
export function anchorFor(
  text?: string,
  geom?: SelGeom | null,
  cursor?: { x: number; y: number } | null,
): { text: string; x: number; y: number } | null {
  const t = text ?? getSelectionText()
  if (!t) return null

  const a = store.state.settings?.appearance

  // Selection completed by mouse: anchor near the release point.
  if (cursor) {
    const x = Math.max(8, Math.min(cursor.x + (a?.offsetX ?? 0), window.innerWidth - TOOLTIP_W))
    const above = cursor.y - TOOLTIP_H - 6
    const below = cursor.y + 12
    // 'above' near the top would clip off-screen; fall back to below like the
    // geometry branch does.
    const y = (a?.anchor === 'above' && above >= 8 ? above : below) + (a?.offsetY ?? 0)
    return { text: t, x, y }
  }

  const g = geom ?? getEndpointRects()
  if (!g) return null

  const left = Math.min(g.start.x, g.end.x)
  const top = Math.min(g.start.top, g.end.top)
  const bottom = Math.max(g.start.top + g.start.height, g.end.top + g.end.height)

  const above = top - TOOLTIP_H - 6
  const below = bottom + 6

  let y: number
  if (a?.anchor === 'below') y = below
  else if (a?.anchor === 'above') y = above
  else y = above < 8 ? below : above // auto

  const x = Math.max(8, Math.min(left + (a?.offsetX ?? 0), window.innerWidth - TOOLTIP_W))
  y += a?.offsetY ?? 0
  return { text: t, x, y }
}
