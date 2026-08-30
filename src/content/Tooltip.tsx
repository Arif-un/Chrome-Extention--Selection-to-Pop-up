import { useSyncExternalStore } from 'preact/compat'
import { useState, useEffect } from 'preact/hooks'
import type { ComponentType, JSX } from 'preact'
import { store } from './store'
import { Result } from './Result'
import { Btn } from '../components/Btn'
import { SvgIcon } from '../components/SvgIcon'
import { BUILTIN_LABELS, type BuiltinKey } from '../lib/builtins'
import { actionTokens, MORE } from '../lib/actions'
import { appearanceStyle } from '../lib/appearance'
import type { AiTarget } from '../lib/ai-targets'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
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
  IconChatGPT,
  IconClaude,
  IconGemini,
  IconGrok,
} from './icons'

const AI_ICONS: Record<AiTarget, ComponentType<Record<string, unknown>>> = {
  chatgpt: IconChatGPT,
  claude: IconClaude,
  gemini: IconGemini,
  grok: IconGrok,
}

interface Item {
  id: string
  label: string
  Icon: ComponentType<Record<string, unknown>>
  /** sanitized inline SVG markup for custom-action icons; overrides Icon when set */
  iconMarkup?: string
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
  const [expanded, setExpanded] = useState(false)
  // Tooltip stays mounted (returns null when closed), so reset the overflow state
  // on close or it reopens already-expanded on the next selection.
  useEffect(() => {
    if (!state.open) setExpanded(false)
  }, [state.open])
  if (!state.open || !state.settings) return null

  const s = state.settings
  const showPanel = state.view.kind !== 'buttons'
  const menuOn = s.moreMenu

  // Walk the unified token list; when the overflow toggle is on, the MORE divider
  // splits primary (always shown) from overflow actions (revealed on ⋯ expand).
  const barItems: Item[] = []
  const overflowItems: Item[] = []
  let past = false
  for (const t of actionTokens(s.actionOrder, s.customActions, s.aiActions)) {
    if (t === MORE) {
      past = true
      continue
    }
    let item: Item | null = null
    if (t.startsWith('ai:')) {
      const ai = s.aiActions.find((x) => `ai:${x.target}` === t)
      if (ai?.enabled)
        item = {
          id: t,
          label: ai.label,
          Icon: AI_ICONS[ai.target],
          run: () => store.performAi(ai.target),
        }
    } else if (t.startsWith('custom:')) {
      const a = s.customActions.find((x) => `custom:${x.id}` === t)
      if (a?.enabled) {
        // Custom SVG markup was sanitized on save (options); the content script trusts
        // the stored value and renders it inline (via SvgIcon) so it inherits
        // currentColor/--stp-fg.
        // ponytail: if a settings-import feature is ever added, re-sanitize here (pulls
        // DOMPurify into the content bundle).
        item = {
          id: t,
          label: a.name,
          Icon: IconBolt,
          iconMarkup: a.icon,
          run: () => store.perform(t),
        }
      }
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
    if (item) (menuOn && past ? overflowItems : barItems).push(item)
  }

  const showToggle = menuOn && overflowItems.length > 0

  // Icon-only action button; copy shows a green check while the copied flag is set.
  const renderItem = (it: Item) =>
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
        {it.iconMarkup ? <SvgIcon markup={it.iconMarkup} /> : <it.Icon />}
      </Btn>
    )

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
      <div class="stp-panel w-max" style={appearanceStyle(s.appearance)}>
        <div class="flex flex-wrap items-center gap-0.5 p-1">
          {barItems.map(renderItem)}
          {/* Overflow buttons stay mounted and collapse to zero-width so both expand
              and collapse animate (a mount/unmount can only transition one way). */}
          {showToggle &&
            overflowItems.map((it) => (
              <span
                key={it.id}
                class={`stp-collapse flex ${expanded ? '' : 'stp-collapse-closed'}`}
              >
                {renderItem(it)}
              </span>
            ))}
          {showToggle && (
            <Btn
              title={expanded ? 'Fewer actions' : 'More actions'}
              onClick={() => setExpanded((o) => !o)}
            >
              {expanded ? <LuChevronLeft size={16} /> : <LuChevronRight size={16} />}
            </Btn>
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
