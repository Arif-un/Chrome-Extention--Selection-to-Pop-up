import { useEffect, useLayoutEffect, useState } from 'preact/hooks'
import { Button } from '../components/ui/Button'
import { TOUR_STEPS, clampStep } from '../lib/tour'

const PAD = 8 // spotlight breathing room around the target
const POP_W = 320

/**
 * Spotlight product tour for the settings page. Dims everything except the
 * current step's target (a box-shadow cutout), scrolls it into view, and shows a
 * popover with Next/Back/Skip. Esc / arrow keys work too. Renders nothing to
 * persist — the caller owns the "seen" flag.
 */
export function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = TOUR_STEPS[i]
  const last = i === TOUR_STEPS.length - 1

  const next = () => (last ? onClose() : setI((n) => clampStep(n + 1, TOUR_STEPS.length)))
  const back = () => setI((n) => clampStep(n - 1, TOUR_STEPS.length))

  // Scroll the target into view and (re)measure it — after the smooth scroll
  // settles, and on resize/scroll so the cutout tracks the element.
  useLayoutEffect(() => {
    const el = document.querySelector(step.target)
    if (!el) {
      setRect(null)
      return
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const measure = () => setRect(el.getBoundingClientRect())
    measure()
    const settle = setTimeout(measure, 350)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(settle)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const spot = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        w: rect.width + PAD * 2,
        h: rect.height + PAD * 2,
      }
    : null
  const below = !!spot && spot.top + spot.h + 200 < window.innerHeight
  const popStyle = spot
    ? {
        left: `${Math.min(Math.max(8, spot.left), window.innerWidth - POP_W - 8)}px`,
        ...(below
          ? { top: `${spot.top + spot.h + 12}px` }
          : { top: `${spot.top - 12}px`, transform: 'translateY(-100%)' }),
      }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <div class="fixed inset-0 z-[9999]">
      {spot ? (
        <div
          class="pointer-events-none fixed rounded-xl transition-all duration-200"
          style={{
            top: `${spot.top}px`,
            left: `${spot.left}px`,
            width: `${spot.w}px`,
            height: `${spot.h}px`,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
          }}
        />
      ) : (
        <div class="fixed inset-0 bg-black/60" />
      )}

      <div
        class="fixed w-80 rounded-xl border border-line bg-surface p-4 shadow-xl"
        style={popStyle}
      >
        <div class="mb-1 text-[13px] font-semibold text-ink">{step.title}</div>
        <p class="text-xs leading-relaxed text-muted">{step.body}</p>
        <div class="mt-4 flex items-center justify-between">
          <span class="text-xs text-muted">
            {i + 1} / {TOUR_STEPS.length}
          </span>
          <div class="flex gap-2">
            <Button onClick={onClose}>Skip</Button>
            {i > 0 && <Button onClick={back}>Back</Button>}
            <Button variant="primary" onClick={next}>
              {last ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
