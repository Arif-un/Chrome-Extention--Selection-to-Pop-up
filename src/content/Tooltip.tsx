import { useSyncExternalStore } from 'preact/compat'
import { useState, useEffect } from 'preact/hooks'
import type { ComponentType, JSX } from 'preact'
import { store } from './store'
import { Result } from './Result'
import { Btn } from '../components/Btn'
import { BUILTIN_LABELS, type BuiltinKey } from '../lib/builtins'
import { actionTokens, MORE } from '../lib/actions'
import { appearanceStyle } from '../lib/appearance'
import {
  IconSearch,
  IconCopy,
  IconCheck,
  IconTranslate,
  IconBook,
  IconCurrency,
  IconBolt,
  IconClose,
  IconGrip,
  IconMore,
} from './icons'

interface Item {
  id: string
  label: string
  Icon: ComponentType<Record<string, unknown>>
  run: () => void
  isCopy?: boolean
}

/** Drag the popup by its top handle, updating store x/y from the pointer delta. */
function startDrag(e: JSX.TargetedPointerEvent<HTMLElement>) {
  e.preventDefault()
  e.stopPropagation()
  const startX = e.clientX
  const startY = e.clientY
  const { x: ox, y: oy } = store.getSnapshot()
  const move = (ev: PointerEvent) => store.move(ox + ev.clientX - startX, oy + ev.clientY - startY)
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  // pointercancel (system gesture, pointer lost) fires instead of pointerup on
  // touch/pen — without this the move listener leaks and the popup keeps tracking.
  window.addEventListener('pointercancel', up)
}

const BUILTIN_ICONS: Record<BuiltinKey, ComponentType<Record<string, unknown>>> = {
  search: IconSearch,
  copy: IconCopy,
  translate: IconTranslate,
  dictionary: IconBook,
  currency: IconCurrency,
}

export function Tooltip() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [menuOpen, setMenuOpen] = useState(false)
  // Tooltip stays mounted (returns null when closed), so reset the overflow menu
  // on close or it reopens already-expanded on the next selection.
  useEffect(() => {
    if (!state.open) setMenuOpen(false)
  }, [state.open])
  if (!state.open || !state.settings) return null

  const s = state.settings
  const showPanel = state.view.kind !== 'buttons'
  const menuOn = s.moreMenu

  // Walk the unified token list; the MORE divider flips items into the ⋯ menu.
  const barItems: Item[] = []
  const menuItems: Item[] = []
  let past = false
  for (const t of actionTokens(s.actionOrder, s.customActions)) {
    if (t === MORE) {
      past = true
      continue
    }
    let item: Item | null = null
    if (t.startsWith('custom:')) {
      const a = s.customActions.find((x) => `custom:${x.id}` === t)
      if (a?.enabled)
        item = { id: t, label: a.name, Icon: IconBolt, run: () => store.perform(t) }
    } else {
      const k = t as BuiltinKey
      if (s.builtins[k])
        item = {
          id: k,
          label: BUILTIN_LABELS[k],
          Icon: BUILTIN_ICONS[k],
          run: () => store.perform(k),
          isCopy: k === 'copy',
        }
    }
    if (item) (menuOn && past ? menuItems : barItems).push(item)
  }

  return (
    <div
      class="group fixed z-[2147483647] font-sans"
      style={{ left: `${state.x}px`, top: `${state.y}px` }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        title="Drag to move"
        onPointerDown={startDrag}
        style={{ ...appearanceStyle(s.appearance), boxShadow: 'none', borderRadius: '50px' }}
        class="stp-panel stp-btn absolute -top-2 left-1/2 z-10 flex h-4 -translate-x-1/2 cursor-grab items-center justify-center px-1 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <IconGrip width={14} height={14} />
      </button>
      <button
        type="button"
        title="Close"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => store.hide()}
        style={{ ...appearanceStyle(s.appearance), boxShadow: 'none', borderRadius: '50px' }}
        class="stp-panel stp-btn absolute -top-2 -right-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center"
      >
        <IconClose width={12} height={12} />
      </button>
      <div class="stp-panel w-max max-w-sm" style={appearanceStyle(s.appearance)}>
        <div class="flex items-center gap-0.5 p-1">
          {barItems.map((it) =>
            it.isCopy && state.copied ? (
              <button
                key={it.id}
                type="button"
                title="Copied!"
                onMouseDown={(e) => e.preventDefault()}
                class="stp-btn stp-btn-ok flex h-8 w-8 cursor-pointer items-center justify-center"
              >
                <IconCheck />
              </button>
            ) : (
              <Btn key={it.id} title={it.label} onClick={it.run}>
                <it.Icon />
              </Btn>
            ),
          )}
          {menuOn && menuItems.length > 0 && (
            <div class="relative">
              <Btn title="More actions" onClick={() => setMenuOpen((o) => !o)}>
                <IconMore />
              </Btn>
              {menuOpen && (
                <div
                  class="stp-panel absolute right-0 top-full z-20 mt-1 min-w-40 overflow-hidden p-1"
                  style={appearanceStyle(s.appearance)}
                >
                  {menuItems.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      title={it.label}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        it.run()
                        setMenuOpen(false)
                      }}
                      class="stp-btn flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left text-sm"
                    >
                      {it.isCopy && state.copied ? <IconCheck /> : <it.Icon />}
                      <span class="truncate">{it.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {showPanel && (
          <div
            class="stp-divider-top stp-expand max-h-72 overflow-auto px-3 py-2"
            style={{ borderTop: 'var(--stp-border)' }}
          >
            {state.view.kind === 'loading' && (
              <div class="stp-muted text-xs">{state.view.label}</div>
            )}
            {state.view.kind === 'error' && (
              <div class="text-xs text-red-400">{state.view.message}</div>
            )}
            {state.view.kind === 'result' && (
              <Result
                result={state.view.result}
                translateTo={state.overrides.translateTo ?? s.translate.targetLang}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
