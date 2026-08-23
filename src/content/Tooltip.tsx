import { useSyncExternalStore } from 'preact/compat'
import type { ComponentType } from 'preact'
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
} from './icons'

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
      class="fixed z-[2147483647] font-sans"
      style={{ left: `${state.x}px`, top: `${state.y}px` }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
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
                  class="stp-btn stp-btn-ok flex h-8 w-8 items-center justify-center"
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
          {showPanel && (
            <>
              <div class="stp-divider mx-0.5 h-5 w-px" />
              <Btn title="Close" onClick={() => store.hide()}>
                <IconClose />
              </Btn>
            </>
          )}
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
