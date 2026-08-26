import { handleColor, bulbSize, type SelectionHandles } from '../lib/handles'

/**
 * One teardrop caret: a vertical bar with a rounded bulb hanging below it.
 * Purely presentational — the parent must be positioned at the bar's top point.
 * Shared by the in-page handles and the options live preview.
 */
export function Handle({
  side,
  h,
  height,
}: {
  side: 'start' | 'end'
  h: SelectionHandles
  height: number
}) {
  const color = handleColor(h)
  const bulb = bulbSize(h)
  const t = h.thickness
  // Square the bulb corner that meets the bar so it reads as a teardrop.
  const radius = side === 'start' ? '50% 0 50% 50%' : '0 50% 50% 50%'
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: `${-t / 2}px`,
          top: '0',
          width: `${t}px`,
          height: `${height}px`,
          background: color,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: `${height}px`,
          left: side === 'start' ? `${-bulb}px` : '0',
          width: `${bulb}px`,
          height: `${bulb}px`,
          background: color,
          borderRadius: radius,
        }}
      />
    </>
  )
}
