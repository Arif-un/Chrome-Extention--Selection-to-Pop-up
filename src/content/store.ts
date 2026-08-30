import { getSettings, onSettingsChange, setSettings } from '../lib/settings'
import type { Settings, AiWindow } from '../lib/types'
import { aiTarget, renderPrompt, surfaceUrl, type AiTarget } from '../lib/ai-targets'
import { popupSize, popupFeatures, type OpenMode } from '../lib/open-mode'
import { updateAt } from '../lib/arr'
import type {
  Request,
  Response,
  TranslateResult,
  DictionaryResult,
  CurrencyResult,
} from '../lib/messages'
import { countText, type CountResult } from '../lib/count'
import { pickSearchEngine } from '../lib/search'
import { hasAiPermission, requestAiPermission } from '../lib/ai-permissions'
import { googleTranslateUrl } from '../lib/translate-url'
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
  | { kind: 'count'; data: CountResult }
  | { kind: 'text'; title: string; body: string }

export type View =
  | { kind: 'buttons' }
  | { kind: 'engines' }
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
  /** open in-page AI iframe window (iframe mode), or null */
  preview: { target: AiTarget; url: string; win: AiWindow } | null
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
    preview: null,
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
    // While dragging, never drop to null: when the two handles meet/cross the
    // selection collapses for a frame, and unmounting the grips would release the
    // dragged grip's pointer capture — its pointerup then never fires and
    // `dragging` sticks true, disabling every handle (including the next
    // selection's). Keep the last geometry so the grips stay mounted.
    const keep = next ?? (this.state.dragging ? this.state.sel : null)
    if (!sameGeom(this.state.sel, keep)) this.set({ sel: keep })
    return keep
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
    if (kind === 'translate' || kind === 'dictionary' || kind === 'currency' || kind === 'count')
      void this.perform(kind)
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

  /** Expand the panel into the engine picker (only from the default buttons view). */
  showEngines() {
    if (this.state.view.kind === 'buttons') this.set({ view: { kind: 'engines' } })
  }

  /** Open a search in a new tab; `engineId` picks a specific engine, else the default. Returns false if no engine/text. */
  searchWith(engineId?: string): boolean {
    const s = this.state.settings
    const text = this.state.text.trim()
    if (!s || !text) return false
    const eng = pickSearchEngine(s.search.engines, s.search.defaultEngineId, engineId)
    if (!eng) return false
    window.open(eng.url.replace('%s', encodeURIComponent(text)), '_blank', 'noopener,noreferrer')
    this.hide()
    return true
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
          if (!this.searchWith()) throw new Error('No search engine configured')
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
            const url = googleTranslateUrl(text, s.translate.targetLang)
            window.open(url, 'Translate', popupFeatures(800, 600, screen.width, screen.height))
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
        case 'count': {
          this.set({ view: { kind: 'result', result: { kind: 'count', data: countText(text) } } })
          return
        }
      }
    } catch (e) {
      this.set({ view: { kind: 'error', message: e instanceof Error ? e.message : String(e) } })
    }
  }

  /** Run an AI action: render the prompt, then open it in the configured surface. */
  async performAi(target: AiTarget) {
    const s = this.state.settings
    const text = this.state.text.trim()
    if (!s || !text) return
    const action = s.aiActions.find((a) => a.target === target)
    if (!action) return
    const def = aiTarget(action.target)
    if (!def) return
    const url = surfaceUrl(def, renderPrompt(action.template, text))

    // Framed surfaces (iframe/sidebar) need the AI host permission so the
    // background DNR rule can strip X-Frame-Options/CSP; without the grant the
    // frame renders blank. Hosts are optional and granted on demand (the default
    // Claude action ships enabled+sidebar with no grant on a fresh install).
    // Check `contains` first: it consumes no user gesture, so the already-granted
    // path preserves the click's transient activation for the background's
    // sidePanel.open (OPEN_AI). Only prompt (spending the gesture) when not yet
    // granted; fall back to a plain tab if the user declines. On the very first
    // sidebar use the prompt spends the gesture and sidePanel.open would reject,
    // so background falls back to a tab that once — the grant then persists.
    if (action.mode === 'iframe' || action.mode === 'sidebar') {
      const granted =
        (await hasAiPermission(action.target)) || (await requestAiPermission(action.target))
      if (!granted) {
        window.open(url, '_blank', 'noopener,noreferrer')
        this.hide()
        return
      }
    }

    if (action.mode === 'iframe') {
      this.set({ preview: { target: action.target, url, win: action.window } })
      return
    }
    // tab / window / sidebar require chrome.tabs/windows/sidePanel — go via background.
    try {
      await chrome.runtime.sendMessage({
        type: 'OPEN_AI',
        url,
        mode: action.mode,
        win: { w: action.window.w, h: action.window.h },
      })
    } catch {
      // background asleep / navigated away — open a plain tab as a last resort
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    this.hide()
  }

  closePreview() {
    if (this.state.preview) this.set({ preview: null })
  }

  /** Persist the iframe window's size/position back to its AI action. */
  async saveAiWindow(target: AiTarget, patch: Partial<AiWindow>) {
    // Re-read fresh: setSettings sends the whole aiActions array and deepMerge
    // replaces it wholesale, so building from the cached state could clobber an
    // aiActions edit made in another context (Options) since this frame loaded.
    const s = await getSettings()
    const i = s.aiActions.findIndex((a) => a.target === target)
    if (i < 0) return
    const aiActions = updateAt(s.aiActions, i, {
      window: { ...s.aiActions[i].window, ...patch },
    })
    await setSettings({ aiActions })
  }

  /** Open a URL in the action's chosen surface (tab / popup window / sidebar). */
  private openUrl(url: string, mode: OpenMode = 'tab') {
    if (mode === 'sidebar') {
      // Reuse the AI side-panel path. ponytail: header-stripping is scoped to AI
      // domains, so arbitrary custom URLs that block framing show blank in the panel.
      void chrome.runtime
        .sendMessage({ type: 'OPEN_AI', url, mode: 'sidebar' })
        .catch(() => window.open(url, '_blank', 'noopener,noreferrer'))
      return
    }
    const size = popupSize(mode)
    if (size) {
      window.open(url, '_blank', popupFeatures(size.w, size.h, screen.width, screen.height))
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  private async runCustom(id: string, text: string, s: Settings, seq: number) {
    const action = s.customActions.find((a) => a.id === id)
    if (!action) return
    if (action.type === 'url') {
      this.openUrl(action.template.replace('%s', encodeURIComponent(text)), action.open)
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
      this.openUrl(out.trim(), action.open)
      this.hide()
    } else {
      this.set({
        view: { kind: 'result', result: { kind: 'text', title: action.name, body: out } },
      })
    }
  }
}

export const store = new Store()
