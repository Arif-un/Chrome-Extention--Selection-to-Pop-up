import { getSettings, onSettingsChange } from '../lib/settings'
import type { Settings } from '../lib/types'
import type {
  Request,
  Response,
  TranslateResult,
  DictionaryResult,
  CurrencyResult,
} from '../lib/messages'
import { runJsAction } from './run-js'
import { getEndpointRects } from './selection'
import { sameGeom, type SelGeom } from '../lib/handles'

/** Copy text, falling back to execCommand on insecure (http) origins where navigator.clipboard is undefined. */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // permission denied / not focused — fall through to execCommand
  }
  // ponytail: execCommand('copy') is deprecated but the only clipboard path on http/insecure origins
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

export type ResultView =
  | { kind: 'translate'; data: TranslateResult }
  | { kind: 'dictionary'; data: DictionaryResult }
  | { kind: 'currency'; data: CurrencyResult }
  | { kind: 'text'; title: string; body: string }

export type View =
  | { kind: 'buttons' }
  | { kind: 'loading'; label: string }
  | { kind: 'error'; message: string }
  | { kind: 'result'; result: ResultView }

export interface State {
  open: boolean
  x: number
  y: number
  text: string
  view: View
  settings: Settings | null
  /** transient: copy just succeeded (drives the green tick on the copy icon) */
  copied: boolean
  /** one-off inline overrides from the tooltip dropdowns; reset per selection */
  overrides: { translateTo?: string; curBase?: string; curTarget?: string }
  /** endpoint geometry for the draggable selection handles (null = hidden) */
  sel: SelGeom | null
  /** a handle is currently being dragged (overlay goes pointer-events:none) */
  dragging: boolean
}

type Listener = () => void

class Store {
  state: State = {
    open: false,
    x: 0,
    y: 0,
    text: '',
    view: { kind: 'buttons' },
    settings: null,
    copied: false,
    overrides: {},
    sel: null,
    dragging: false,
  }
  private listeners = new Set<Listener>()
  private copyTimer?: ReturnType<typeof setTimeout>
  /** bumped per perform(); async results from a superseded run are dropped */
  private reqSeq = 0
  /** set on a mouse handle-drag end so the trailing document mouseup skips showButtons */
  private dragJustEnded = false

  async init() {
    this.state.settings = await getSettings()
    this.emit()
    onSettingsChange((s) => {
      this.state.settings = s
      this.emit()
    })
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  getSnapshot = () => this.state

  private set(patch: Partial<State>) {
    this.state = { ...this.state, ...patch }
    this.emit()
  }
  private emit() {
    this.listeners.forEach((l) => l())
  }

  showButtons(text: string, x: number, y: number) {
    if (!text) return
    this.set({ open: true, x, y, text, view: { kind: 'buttons' }, copied: false, overrides: {} })
  }
  hide() {
    if (this.state.open) this.set({ open: false })
  }

  /** Reposition the popup (used by the tooltip drag handle). */
  move(x: number, y: number) {
    this.set({ x, y })
  }

  setDragging(v: boolean) {
    if (this.state.dragging !== v) this.set({ dragging: v })
  }

  /** End a handle drag; mouse drags flag the trailing mouseup so it won't reset the view. */
  endDrag(fromMouse: boolean) {
    this.setDragging(false)
    if (fromMouse) this.dragJustEnded = true
  }

  /** True once per mouse handle-drag end; consumed by the document mouseup handler. */
  consumeDragEnd(): boolean {
    const v = this.dragJustEnded
    this.dragJustEnded = false
    return v
  }

  /**
   * Recompute handle geometry from the current selection (or hide if off/empty).
   * Returns the geometry so callers can reuse it (e.g. re-anchoring the popup)
   * without measuring the selection a second time. Skips emit when unchanged.
   */
  syncHandles(): SelGeom | null {
    const on = this.state.settings?.selectionHandles.enabled
    const next = on ? getEndpointRects() : null
    if (!sameGeom(this.state.sel, next)) this.set({ sel: next })
    return next
  }

  /** While a handle is dragged: keep an open popup on the (new) selection. */
  updateAnchor(text: string, x: number, y: number) {
    if (!this.state.open || !text) return
    this.set({ text, x, y })
  }

  /** Re-run the action currently shown in the popup against the new selection. */
  rerunActive() {
    const v = this.state.view
    if (v.kind !== 'result') return
    const kind = v.result.kind
    // 'text' results come from custom actions (possible side effects) — don't auto-rerun.
    if (kind === 'translate' || kind === 'dictionary' || kind === 'currency') void this.perform(kind)
  }

  /** Inline one-off language override for translate; re-runs the lookup. */
  setTranslateLang(code: string) {
    this.set({ overrides: { ...this.state.overrides, translateTo: code } })
    void this.perform('translate')
  }

  /** Inline one-off currency source/target override; re-runs the conversion. */
  setCurrency(patch: { base?: string; target?: string }) {
    this.set({
      overrides: {
        ...this.state.overrides,
        ...(patch.base !== undefined && { curBase: patch.base }),
        ...(patch.target !== undefined && { curTarget: patch.target }),
      },
    })
    void this.perform('currency')
  }

  private async request<T>(msg: Request): Promise<T> {
    const res = (await chrome.runtime.sendMessage(msg)) as Response<T>
    if (!res?.ok) throw new Error(res?.error ?? 'Request failed')
    return res.data
  }

  async perform(action: string, textOverride?: string) {
    const s = this.state.settings
    const text = (textOverride ?? this.state.text).trim()
    if (!s || !text) return
    this.set({ text })
    const seq = ++this.reqSeq

    try {
      if (action.startsWith('custom:')) return await this.runCustom(action.slice(7), text, s, seq)

      switch (action) {
        case 'search': {
          const eng =
            s.search.engines.find((e) => e.id === s.search.defaultEngineId) ?? s.search.engines[0]
          if (!eng) throw new Error('No search engine configured')
          window.open(eng.url.replace('%s', encodeURIComponent(text)), '_blank')
          this.hide()
          return
        }
        case 'copy': {
          const ok = await writeClipboard(text)
          if (!ok) throw new Error('Copy failed')
          // no panel — just flip the copy icon to a green tick briefly
          clearTimeout(this.copyTimer)
          this.set({ copied: true })
          this.copyTimer = setTimeout(() => this.set({ copied: false }), 1500)
          return
        }
        case 'translate': {
          if (s.translate.openInWindow) {
            const url = `https://translate.google.com/?sl=auto&tl=${s.translate.targetLang}&text=${encodeURIComponent(text)}&op=translate`
            const w = 800
            const h = 600
            const left = Math.max(0, (screen.width - w) / 2)
            const top = Math.max(0, (screen.height - h) / 2)
            window.open(url, 'Translate', `width=${w},height=${h},left=${left},top=${top}`)
            this.hide()
            return
          }
          this.set({ view: { kind: 'loading', label: 'Translating…' } })
          const data = await this.request<TranslateResult>({
            type: 'TRANSLATE',
            text,
            targetLang: this.state.overrides.translateTo,
          })
          if (seq !== this.reqSeq) return
          this.set({ view: { kind: 'result', result: { kind: 'translate', data } } })
          return
        }
        case 'dictionary': {
          this.set({ view: { kind: 'loading', label: 'Looking up…' } })
          const data = await this.request<DictionaryResult>({ type: 'DICTIONARY', word: text })
          if (seq !== this.reqSeq) return
          this.set({ view: { kind: 'result', result: { kind: 'dictionary', data } } })
          return
        }
        case 'currency': {
          this.set({ view: { kind: 'loading', label: 'Converting…' } })
          const data = await this.request<CurrencyResult>({
            type: 'CURRENCY',
            text,
            base: this.state.overrides.curBase,
            target: this.state.overrides.curTarget,
          })
          if (seq !== this.reqSeq) return
          this.set({ view: { kind: 'result', result: { kind: 'currency', data } } })
          return
        }
      }
    } catch (e) {
      this.set({ view: { kind: 'error', message: e instanceof Error ? e.message : String(e) } })
    }
  }

  private async runCustom(id: string, text: string, s: Settings, seq: number) {
    const action = s.customActions.find((a) => a.id === id)
    if (!action) return
    if (action.type === 'url') {
      window.open(action.template.replace('%s', encodeURIComponent(text)), '_blank')
      this.hide()
      return
    }
    // js action
    this.set({ view: { kind: 'loading', label: `${action.name}…` } })
    const out = await runJsAction(action.template, {
      text,
      url: location.href,
      title: document.title,
    })
    if (seq !== this.reqSeq) return
    if (/^https?:\/\//i.test(out.trim())) {
      window.open(out.trim(), '_blank')
      this.hide()
    } else {
      this.set({
        view: { kind: 'result', result: { kind: 'text', title: action.name, body: out } },
      })
    }
  }
}

export const store = new Store()
