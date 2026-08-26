import { useSyncExternalStore } from 'preact/compat'
import type { ComponentType, JSX } from 'preact'
import { store } from './store'
import { Result } from './Result'
import { Btn } from '../components/Btn'
import { BUILTIN_LABELS, BUILTIN_KEYS, type BuiltinKey } from '../lib/builtins'
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
} from './icons'

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
  if (!state.open || !state.settings) return null

  const s = state.settings
  const showPanel = state.view.kind !== 'buttons'
  const enabledBuiltins = BUILTIN_KEYS.filter((k) => s.builtins[k])

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
        style={appearanceStyle(s.appearance)}
        class="stp-panel stp-btn absolute -top-2 left-1/2 z-10 flex h-4 -translate-x-1/2 cursor-grab items-center justify-center px-1 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <IconGrip width={14} height={14} />
      </button>
      <button
        type="button"
        title="Close"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => store.hide()}
        style={{ ...appearanceStyle(s.appearance), borderRadius: '9999px' }}
        class="stp-panel stp-btn absolute -top-2 -right-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center"
      >
        <IconClose width={12} height={12} />
      </button>
      <div class="stp-panel w-max max-w-sm" style={appearanceStyle(s.appearance)}>
        <div class="flex items-center gap-0.5 p-1">
          {enabledBuiltins.map((k) => {
            const Icon = BUILTIN_ICONS[k]
            if (k === 'copy' && state.copied) {
              return (
                <button
                  key={k}
                  type="button"
                  title="Copied!"
                  onMouseDown={(e) => e.preventDefault()}
                  class="stp-btn stp-btn-ok flex h-8 w-8 cursor-pointer items-center justify-center"
                >
                  <IconCheck />
                </button>
              )
            }
            return (
              <Btn key={k} title={BUILTIN_LABELS[k]} onClick={() => store.perform(k)}>
                <Icon />
              </Btn>
            )
          })}
          {s.customActions
            .filter((a) => a.enabled)
            .map((a) => (
              <Btn key={a.id} title={a.name} onClick={() => store.perform(`custom:${a.id}`)}>
                <IconBolt />
              </Btn>
            ))}
        </div>

        {showPanel && (
          <div
            class="stp-divider-top max-h-72 overflow-auto px-3 py-2"
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
