import { useSyncExternalStore } from 'preact/compat'
import { useRef } from 'preact/hooks'
import { store } from './store'
import { Handle } from './Handle'
import { beginDrag, applyDrag, getSelectionText, type DragSide, type DragCtx } from './selection'
import { bulbSize, type EndRect, type SelectionHandles } from '../lib/handles'
import { anchorFor } from './anchor'

const Z = 2147483646 // just under the popup, above the page

export function Handles() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const ctx = useRef<DragCtx | null>(null)
  const h = state.settings?.selectionHandles

  if (!h?.enabled || !state.sel) return null

  return (
    <>
      <Grip side="start" rect={state.sel.start} h={h} ctx={ctx} dragging={state.dragging} />
      <Grip side="end" rect={state.sel.end} h={h} ctx={ctx} dragging={state.dragging} />
    </>
  )
}

function Grip({
  side,
  rect,
  h,
  ctx,
  dragging,
}: {
  side: DragSide
  rect: EndRect
  h: SelectionHandles
  ctx: { current: DragCtx | null }
  dragging: boolean
}) {
  const bulb = bulbSize(h)
  // Hit target == the visible bulb only, so the grip never swallows clicks on
  // page content near the selection. Users needing a bigger target raise `size`.
  const pad = bulb
  // Bulb centre relative to the bar's top point (the fixed wrapper origin).
  const cx = side === 'start' ? -bulb / 2 : bulb / 2
  const cy = rect.height + bulb / 2

  const onDown = (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ctx.current = beginDrag(side)
    if (!ctx.current) return
    // Capture keeps delivering move events even after the overlay goes
    // pointer-events:none, which lets caretRangeFromPoint see the page text
    // under the finger instead of this pad.
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    store.setDragging(true)
  }
  const onMove = (e: PointerEvent) => {
    if (!ctx.current) return
    e.preventDefault()
    applyDrag(ctx.current, e.clientX, e.clientY)
  }
  const onUp = (e: PointerEvent) => {
    if (!ctx.current) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    ctx.current = null
    store.endDrag(e.type === 'pointerup' && e.pointerType === 'mouse')
    const g = store.syncHandles()
    if (store.state.open) {
      const a = anchorFor(getSelectionText(), g)
      if (a) store.updateAnchor(a.text, a.x, a.y)
    }
    store.rerunActive()
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: `${rect.x}px`,
        top: `${rect.top}px`,
        width: '0',
        height: '0',
        zIndex: Z,
        pointerEvents: 'none',
      }}
    >
      <Handle side={side} h={h} height={rect.height} />
      <div
        data-stp-handle={side}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onMouseDown={(e) => {
          // preventDefault stops the browser collapsing the selection on grab.
          e.preventDefault()
          e.stopPropagation()
        }}
        style={{
          position: 'absolute',
          left: `${cx - pad / 2}px`,
          top: `${cy - pad / 2}px`,
          width: `${pad}px`,
          height: `${pad}px`,
          borderRadius: '50%',
          // While dragging, drop hit-testing so caretRangeFromPoint reads the
          // page, not this overlay; pointer capture still routes move events here.
          pointerEvents: dragging ? 'none' : 'auto',
          cursor: 'grab',
          touchAction: 'none',
        }}
      />
    </div>
  )
}
