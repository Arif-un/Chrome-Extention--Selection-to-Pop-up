import { useSyncExternalStore } from 'preact/compat'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import { store } from './store'
import { hexToRgba } from '../lib/appearance'
import { aiTarget, wrappedFrameUrl } from '../lib/ai-targets'
import { IconClose, IconGrip } from './icons'

/**
 * In-page AI window (iframe mode). Draggable by its header, resizable from the
 * bottom-right corner. Size/position persist back to the action on release.
 *
 * The AI is NOT framed directly (that would be page-origin-initiated and the
 * scoped DNR strip wouldn't fire). It's nested through our extension side-panel
 * page via wrappedFrameUrl, so the AI frame's initiator is the extension origin.
 *
 * ponytail: the framed AI is a logged-OUT, 3rd-party context (SameSite cookies
 * don't cross the frame) and some sites JS-bust out of frames anyway — that
 * ceiling is inherent to iframing and documented in the options UI.
 */
export function PreviewFrame() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const p = state.preview

  // Live geometry while open; seeded from the saved window on each open.
  const [geom, setGeom] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [busy, setBusy] = useState(false) // drag/resize in progress → iframe ignores pointer
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!p) return
    const { win } = p
    const w = win.w
    const h = win.h
    const x = win.x ?? Math.max(8, Math.round((window.innerWidth - w) / 2))
    const y = win.y ?? Math.max(8, Math.round((window.innerHeight - h) / 2))
    setGeom({ x, y, w, h })
  }, [p?.target, p?.url])

  if (!p) return null
  const def = aiTarget(p.target)

  const drag = (e: JSX.TargetedPointerEvent<HTMLElement>) => {
    e.preventDefault()
    const sx = e.clientX
    const sy = e.clientY
    const { x, y } = geom
    setBusy(true)
    const move = (ev: PointerEvent) =>
      setGeom((g) => ({ ...g, x: x + ev.clientX - sx, y: y + ev.clientY - sy }))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setBusy(false)
      setGeom((g) => {
        void store.saveAiWindow(p.target, { x: g.x, y: g.y })
        return g
      })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    // pointercancel (touch/pen, pointer lost) fires instead of pointerup — without
    // it the move listener leaks and `busy` sticks true, freezing the iframe.
    window.addEventListener('pointercancel', up)
  }

  const resize = (e: JSX.TargetedPointerEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const sx = e.clientX
    const sy = e.clientY
    const { w, h } = geom
    setBusy(true)
    const move = (ev: PointerEvent) =>
      setGeom((g) => ({
        ...g,
        w: Math.max(280, w + ev.clientX - sx),
        h: Math.max(200, h + ev.clientY - sy),
      }))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setBusy(false)
      setGeom((g) => {
        void store.saveAiWindow(p.target, { w: g.w, h: g.h })
        return g
      })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const { win } = p
  return (
    <div
      ref={box}
      class="fixed z-[2147483647] flex flex-col overflow-hidden font-sans"
      style={{
        left: `${geom.x}px`,
        top: `${geom.y}px`,
        width: `${geom.w}px`,
        height: `${geom.h}px`,
        background: hexToRgba(win.bg, win.bgOpacity),
        borderRadius: `${win.radius}px`,
        border: win.border ? `1px solid ${win.borderColor}` : 'none',
        boxShadow: win.shadow ? '0 12px 40px rgba(0,0,0,0.45)' : 'none',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <header
        onPointerDown={drag}
        class="flex h-8 shrink-0 cursor-grab items-center gap-2 px-2 text-white/90 active:cursor-grabbing"
        style={{ borderBottom: `1px solid ${win.borderColor}` }}
      >
        <IconGrip width={14} height={14} />
        <span class="text-xs font-medium">{def?.label ?? 'AI'}</span>
        <button
          type="button"
          title="Close"
          onClick={() => store.closePreview()}
          onPointerDown={(e) => e.stopPropagation()}
          class="ml-auto flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm hover:bg-white/15"
        >
          <IconClose width={12} height={12} />
        </button>
      </header>
      <iframe
        src={wrappedFrameUrl(chrome.runtime.getURL('src/sidepanel/index.html'), p.url)}
        title={def?.label ?? 'AI'}
        class="flex-1 border-0"
        style={{ pointerEvents: busy ? 'none' : 'auto', background: '#fff' }}
      />
      <span
        onPointerDown={resize}
        title="Resize"
        class="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
        style={{
          background:
            'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.5) 60%, transparent 60%)',
        }}
      />
    </div>
  )
}
