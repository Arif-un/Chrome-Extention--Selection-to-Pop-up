import { useEffect, useRef, useState } from 'preact/hooks'
import { setSettings } from '../lib/settings'
import { useSettings } from '../lib/useSettings'
import { DEFAULT_SETTINGS } from '../lib/defaults'
import { updateAt, moveBefore } from '../lib/arr'
import { BUILTIN_LABELS } from '../lib/builtins'
import { actionTokens, MORE } from '../lib/actions'
import type { Settings, SearchEngine, CustomAction, AiAction, AiWindow, AiMode } from '../lib/types'
import { OPEN_MODE_LABELS, type OpenMode } from '../lib/open-mode'
import { AI_PRESETS, presetIdFor } from '../lib/ai-presets'
import { requestAiPermission } from '../lib/ai-permissions'
import { LANGS, CURRENCIES } from '../lib/langs'
import {
  PRESETS,
  appearanceStyle,
  hexToRgba,
  type Appearance,
  type PresetName,
} from '../lib/appearance'
import type { SelectionHandles } from '../lib/handles'
import { Handle } from '../content/Handle'
import { Section } from '../components/Section'
import { SvgIcon } from '../components/SvgIcon'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { Switch } from '../components/ui/Switch'
import { Row } from '../components/ui/Row'
import { ThemeToggle } from '../components/ThemeToggle'
import { Toc } from './Toc'
import { Tour } from './Tour'
import { tourSeen, markTourSeen } from '../lib/tour'
import {
  IconSearch,
  IconCopy,
  IconTranslate,
  IconBook,
  IconBolt,
  IconGear,
  IconSun,
  IconMoon,
} from '../content/icons'
import { resolveIcon } from '../lib/svg-icon'
import {
  CHROME_STORE_URL,
  GITHUB_ISSUES_URL,
  GITHUB_FEATURE_URL,
  randomFeedbackMessage,
} from '../lib/feedback'

const swatch =
  'h-7 w-10 shrink-0 cursor-pointer rounded-md border border-line bg-transparent disabled:opacity-40'
const slider = 'w-full accent-accent'

// Module-level so its identity is stable across Options re-renders (slider drags,
// keystrokes). An inline component would remount the button and drop keyboard focus.
function PreviewBgToggle({ light, onToggle }: { light: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={light ? 'Preview on dark background' : 'Preview on light background'}
      class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-black/40 text-white/90 backdrop-blur hover:bg-black/60"
    >
      {light ? <IconMoon width={15} height={15} /> : <IconSun width={15} height={15} />}
    </button>
  )
}

export function Options() {
  const [s, setS] = useSettings()
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  // Preview backdrop defaults to the settings-page theme; null = follow theme,
  // set = explicit user override (view-only, not persisted). Track the .dark class
  // on <html> directly so it reacts to the ThemeToggle in this same tab (the
  // toggle's storage event never fires in the tab that made the change).
  const [pageDark, setPageDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )
  const [previewOverride, setPreviewOverride] = useState<boolean | null>(null)
  // Random feedback nudge, fixed per page open (picked once on mount).
  const [feedbackMsg] = useState(randomFeedbackMessage)
  // Guided tour: auto-runs the first time settings is ever opened (per device),
  // and any time via the header button. Ref guards the once-only auto-start
  // against re-renders (s changes on every edit).
  const [tourOpen, setTourOpen] = useState(false)
  const tourChecked = useRef(false)
  useEffect(() => {
    if (!s || tourChecked.current) return
    tourChecked.current = true
    void tourSeen().then((seen) => {
      if (!seen) {
        setTourOpen(true)
        void markTourSeen()
      }
    })
  }, [s])
  // Scroll to the hash target (e.g. #feedback from the popup) once content renders.
  const scrolledToHash = useRef(false)
  useEffect(() => {
    if (!s || scrolledToHash.current) return
    scrolledToHash.current = true
    const id = location.hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [s])
  useEffect(() => {
    const el = document.documentElement
    const obs = new MutationObserver(() => {
      setPageDark(el.classList.contains('dark'))
      setPreviewOverride(null) // theme switch wins; drop any preview override
    })
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  // in-flight drag source + current drop-target index within the action list
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  // storage snapshot as loaded; used to save only edited sections so a concurrent
  // write elsewhere (e.g. the popup toggling trigger.onSelection) isn't clobbered.
  const baseline = useRef<Settings | null>(null)
  if (s && !baseline.current) baseline.current = s

  if (!s) return <div class="p-8 text-muted">Loading…</div>

  // Same section-diff the save uses: nothing changed vs. the loaded snapshot => nothing to save.
  const base = baseline.current ?? s
  const dirty = (Object.keys(s) as (keyof Settings)[]).some(
    (k) => JSON.stringify(s[k]) !== JSON.stringify(base[k]),
  )

  const update = (patch: Partial<Settings>) => {
    setS({ ...s, ...patch })
    setSaved(false)
  }
  const save = async () => {
    const base = baseline.current ?? s
    const patch: Partial<Settings> = {}
    for (const k of Object.keys(s) as (keyof Settings)[]) {
      if (JSON.stringify(s[k]) !== JSON.stringify(base[k])) {
        ;(patch as Record<string, unknown>)[k] = s[k]
      }
    }
    try {
      const next = await setSettings(patch)
      baseline.current = next
      setS(next)
      setSaveErr(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (e) {
      // storage.sync can reject (e.g. QUOTA_BYTES_PER_ITEM: large SVG icons in
      // the single ~8KB settings item). Surface it instead of dropping the edits
      // silently and leaving the button on plain "Save".
      setSaveErr(e instanceof Error ? e.message : 'Save failed')
    }
  }
  const reset = () => {
    setS(structuredClone(DEFAULT_SETTINGS))
    setSaved(false)
  }

  // --- search engines ---
  const setEngines = (engines: SearchEngine[]) => update({ search: { ...s.search, engines } })
  const addEngine = () =>
    setEngines([
      ...s.search.engines,
      {
        id: crypto.randomUUID(),
        name: 'New engine',
        url: 'https://example.com/?q=%s',
        enabled: true,
      },
    ])

  // --- custom actions ---
  // Reconcile the unified order on every change so new ids appear and stale ones drop.
  const setActions = (customActions: CustomAction[]) =>
    update({ customActions, actionOrder: actionTokens(s.actionOrder, customActions, s.aiActions) })
  // Per-action icon source draft + inline error, keyed by action id.
  const [iconInput, setIconInput] = useState<Record<string, string>>({})
  const [iconErr, setIconErr] = useState<Record<string, string>>({})
  const applyIcon = async (id: string) => {
    try {
      const icon = await resolveIcon(iconInput[id] ?? '')
      // Merge into the latest state by id: resolveIcon may await a network fetch,
      // during which another action could be edited/deleted; a captured-array
      // write-back would clobber it. Icon-only edit needs no actionOrder reconcile.
      setS((prev) =>
        prev
          ? {
              ...prev,
              customActions: prev.customActions.map((a) => (a.id === id ? { ...a, icon } : a)),
            }
          : prev,
      )
      setSaved(false)
      setIconErr((e) => ({ ...e, [id]: '' }))
      setIconInput((v) => ({ ...v, [id]: '' }))
    } catch (err) {
      setIconErr((e) => ({ ...e, [id]: err instanceof Error ? err.message : String(err) }))
    }
  }
  const clearIcon = (ci: number, id: string) => {
    setActions(updateAt(s.customActions, ci, { icon: undefined }))
    setIconErr((e) => ({ ...e, [id]: '' }))
  }
  const addAction = (type: CustomAction['type']) =>
    setActions([
      ...s.customActions,
      {
        id: crypto.randomUUID(),
        name: type === 'url' ? 'New link action' : 'New JS action',
        type,
        template: type === 'url' ? 'https://example.com/?q=%s' : 'return input.text.toUpperCase()',
        enabled: true,
        open: 'tab',
      },
    ])

  // --- AI assistants (rendered inline in the unified action list) ---
  const [aiOpen, setAiOpen] = useState<Record<string, boolean>>({})
  const setAi = (i: number, patch: Partial<AiAction>) =>
    update({ aiActions: updateAt(s.aiActions, i, patch) })
  // Framed modes (sidebar / in-page window) rely on the DNR header-strip, which
  // needs the AI host permission (optional). Request it before switching; if the
  // user denies, keep the current mode so we never leave a mode that can't work.
  const setAiMode = async (i: number, mode: AiMode) => {
    if (mode === 'sidebar' || mode === 'iframe') {
      const ok = await requestAiPermission(s.aiActions[i].target)
      if (!ok) return
    }
    setAi(i, { mode })
  }
  const setAiWin = (i: number, patch: Partial<AiWindow>) =>
    setAi(i, { window: { ...s.aiActions[i].window, ...patch } })

  // --- appearance ---
  const a = s.appearance
  const setAppr = (patch: Partial<Appearance>, markCustom = true) =>
    update({
      appearance: { ...a, ...patch, ...(markCustom ? { preset: 'custom' as const } : {}) },
    })
  const applyPreset = (name: PresetName) => {
    if (name === 'custom') {
      update({ appearance: { ...a, preset: 'custom' } })
      return
    }
    update({ appearance: { ...a, ...PRESETS[name], preset: name } })
  }

  // --- selection handles ---
  const hh = s.selectionHandles
  const setHandles = (patch: Partial<SelectionHandles>) =>
    update({ selectionHandles: { ...hh, ...patch } })

  // --- unified action list (built-ins + custom + the ⋯ divider) ---
  const tokens = actionTokens(s.actionOrder, s.customActions, s.aiActions)
  const moreIdx = tokens.indexOf(MORE)
  const reorder = (to: number) => {
    // Drop indicator is a top border on the hovered row, so the item lands
    // before it (moveBefore handles the downward-drag off-by-one).
    if (dragIdx !== null) update({ actionOrder: moveBefore(tokens, dragIdx, to) })
    setDragIdx(null)
  }

  // shared backdrop + top-right light/dark switch for both preview panes
  const previewLight = previewOverride ?? !pageDark
  const previewBg = previewLight
    ? {
        backgroundColor: '#f1f5f9',
        backgroundImage:
          'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
      }
    : {
        backgroundColor: '#0b1220',
        backgroundImage:
          'linear-gradient(45deg, #131c2e 25%, transparent 25%), linear-gradient(-45deg, #131c2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #131c2e 75%), linear-gradient(-45deg, transparent 75%, #131c2e 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
      }
  const togglePreview = () => setPreviewOverride(!previewLight)

  return (
    <div class="mx-auto max-w-2xl p-6 lg:max-w-5xl">
      <header class="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-line bg-canvas/80 px-6 py-3 backdrop-blur">
        <div class="flex items-center gap-2.5">
          <img
            src={chrome.runtime.getURL('src/assets/icons/select-logo-48.png')}
            alt=""
            width={32}
            height={32}
            class="shrink-0 rounded-md"
          />
          <div>
            <h1 class="text-lg font-semibold text-ink">Select to Action</h1>
            <p class="text-xs text-muted">Settings</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          {saveErr && <span class="text-xs text-red-500">{saveErr}</span>}
          <ThemeToggle />
          <Button onClick={() => setTourOpen(true)}>Take a tour</Button>
          <Button onClick={reset}>Reset</Button>
          <Button variant="primary" onClick={save} disabled={!dirty} data-tour="save">
            {saved ? 'Saved ✓' : 'Save'}
          </Button>
        </div>
      </header>

      {tourOpen && <Tour onClose={() => setTourOpen(false)} />}

      <div class="mt-6 lg:flex lg:gap-8">
        <Toc />
        <div class="space-y-6 lg:flex-1 pb-[70vh]">
          <Section
            title="Trigger"
            divided
            footnote="Context menu and the keyboard shortcut (Alt+S, editable at chrome://extensions/shortcuts) always work."
          >
            <Switch
              label="Show popup automatically on text selection"
              checked={s.trigger.onSelection}
              onChange={(v) => update({ trigger: { onSelection: v } })}
            />
          </Section>

          <Section
            title="Actions"
            desc="One list for the popup. Drag to reorder; anything below the ⋯ divider shows in the overflow menu."
            footnote={
              <>
                Custom URL: use <code>%s</code> for the selection. Custom JS: a function body with{' '}
                <code>input</code> = <code>{'{ text, url, title }'}</code> in scope;{' '}
                <code>return</code> a string (shown) or an <code>http(s)</code> URL (opened). Runs
                sandboxed — no page or extension access.
              </>
            }
          >
            <div class="space-y-2">
              {tokens.map((t, i) => {
                const indent = i > moreIdx ? 'ml-6' : ''
                const isSrc = dragIdx === i
                // accent line marks where the item drops; source row dims while dragging
                const dnd = `${overIdx === i && dragIdx !== null && !isSrc ? 'border-t-2 border-accent' : 'border-t-2 border-transparent'} ${isSrc ? 'opacity-40' : ''}`
                const dragHandle = (
                  <span
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragEnd={() => {
                      setDragIdx(null)
                      setOverIdx(null)
                    }}
                    class="cursor-grab select-none px-1 text-muted"
                    title="Drag to reorder"
                  >
                    ⠿
                  </span>
                )
                const dropProps = {
                  onDragOver: (e: DragEvent) => {
                    e.preventDefault()
                    if (overIdx !== i) setOverIdx(i)
                  },
                  onDrop: () => {
                    reorder(i)
                    setOverIdx(null)
                  },
                }

                if (t === MORE) {
                  return (
                    <div key="more" {...dropProps} class={`flex items-center gap-2 py-1 ${dnd}`}>
                      <span class="h-px flex-1 bg-line" />
                      <span class="text-xs font-medium uppercase tracking-wide text-muted">
                        ⋯ Overflow menu
                      </span>
                      <Switch
                        title="Enable overflow menu"
                        checked={s.moreMenu}
                        onChange={(v) => update({ moreMenu: v })}
                      />
                      <span class="h-px flex-1 bg-line" />
                    </div>
                  )
                }

                if (t.startsWith('ai:')) {
                  const ai = s.aiActions.findIndex((a) => `ai:${a.target}` === t)
                  const action = s.aiActions[ai]
                  if (!action) return null
                  const open = !!aiOpen[action.target]
                  const w = action.window
                  const framed = action.mode === 'iframe'
                  const sized = action.mode === 'iframe' || action.mode === 'window'
                  return (
                    <div
                      key={action.target}
                      {...dropProps}
                      class={`rounded-lg border border-line bg-surface-hover/50 p-2.5 ${indent} ${dnd}`}
                    >
                      <div class="flex items-center gap-2">
                        {dragHandle}
                        <span class="text-sm font-medium text-ink">{action.label}</span>
                        <span class="rounded-md bg-surface-hover px-2 py-0.5 text-xs font-medium uppercase text-muted">
                          AI
                        </span>
                        <div class="ml-auto flex items-center gap-2">
                          <Select
                            value={action.mode}
                            onChange={(e) => void setAiMode(ai, e.currentTarget.value as AiMode)}
                          >
                            <option value="tab">New tab</option>
                            <option value="window">Popup window</option>
                            <option value="sidebar">Sidebar</option>
                            <option value="iframe">In-page window</option>
                          </Select>
                          <button
                            type="button"
                            title="Edit prompt & window"
                            aria-expanded={open}
                            onClick={() =>
                              setAiOpen((o) => ({ ...o, [action.target]: !o[action.target] }))
                            }
                            class={`flex h-7 w-7 items-center justify-center rounded-md border border-line hover:text-ink ${open ? 'text-ink' : 'text-muted'}`}
                          >
                            <IconGear width={15} height={15} />
                          </button>
                          <Switch
                            title="Enabled"
                            checked={action.enabled}
                            onChange={(v) => setAi(ai, { enabled: v })}
                          />
                        </div>
                      </div>

                      {open && (
                        <div class="mt-2 space-y-2 border-t border-line pt-2">
                          <label class="flex items-center gap-3 text-sm">
                            <span class="text-ink">Preset</span>
                            <Select
                              value={presetIdFor(action.template)}
                              onChange={(e) => {
                                const p = AI_PRESETS.find((x) => x.id === e.currentTarget.value)
                                if (p) setAi(ai, { template: p.template })
                              }}
                            >
                              {presetIdFor(action.template) === 'custom' && (
                                <option value="custom">Custom</option>
                              )}
                              {AI_PRESETS.map((p) => (
                                <option value={p.id}>{p.label}</option>
                              ))}
                            </Select>
                          </label>
                          <Textarea
                            class="h-14 w-full font-mono text-xs"
                            placeholder="Prompt, e.g. Explain simply: {selection}"
                            value={action.template}
                            onInput={(e) => setAi(ai, { template: e.currentTarget.value })}
                          />
                          <p class="text-xs text-muted">
                            Use <code>{'{selection}'}</code> for the selected text. Tab, Window and
                            Sidebar keep you logged in; In-page window is embedded in the page
                            (logged-out, and some sites refuse to load).
                          </p>
                          {sized && (
                            <div class="grid grid-cols-2 gap-2">
                              <Row label="Width">
                                <Input
                                  type="number"
                                  value={w.w}
                                  onInput={(e) => setAiWin(ai, { w: +e.currentTarget.value || 0 })}
                                  class="w-24"
                                />
                              </Row>
                              <Row label="Height">
                                <Input
                                  type="number"
                                  value={w.h}
                                  onInput={(e) => setAiWin(ai, { h: +e.currentTarget.value || 0 })}
                                  class="w-24"
                                />
                              </Row>
                            </div>
                          )}
                          {framed && (
                            <div class="grid grid-cols-2 gap-3 border-t border-line pt-2">
                              <Row label="Background">
                                <input
                                  type="color"
                                  value={w.bg}
                                  onInput={(e) => setAiWin(ai, { bg: e.currentTarget.value })}
                                  class={swatch}
                                />
                              </Row>
                              <Row label="Border color">
                                <input
                                  type="color"
                                  value={w.borderColor}
                                  disabled={!w.border}
                                  onInput={(e) =>
                                    setAiWin(ai, { borderColor: e.currentTarget.value })
                                  }
                                  class={swatch}
                                />
                              </Row>
                              <label class="block text-sm text-ink">
                                Opacity{' '}
                                <span class="text-muted">{Math.round(w.bgOpacity * 100)}%</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={w.bgOpacity}
                                  onInput={(e) =>
                                    setAiWin(ai, { bgOpacity: +e.currentTarget.value })
                                  }
                                  class={slider}
                                />
                              </label>
                              <label class="block text-sm text-ink">
                                Roundness <span class="text-muted">{w.radius}px</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={w.radius}
                                  onInput={(e) => setAiWin(ai, { radius: +e.currentTarget.value })}
                                  class={slider}
                                />
                              </label>
                              <div class="flex gap-6">
                                <Switch
                                  label="Border"
                                  checked={w.border}
                                  onChange={(v) => setAiWin(ai, { border: v })}
                                />
                                <Switch
                                  label="Shadow"
                                  checked={w.shadow}
                                  onChange={(v) => setAiWin(ai, { shadow: v })}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                }

                if (t.startsWith('custom:')) {
                  const ci = s.customActions.findIndex((a) => `custom:${a.id}` === t)
                  const action = s.customActions[ci]
                  if (!action) return null
                  return (
                    <div
                      key={action.id}
                      {...dropProps}
                      class={`rounded-lg border border-line bg-surface-hover/50 p-2.5 ${indent} ${dnd}`}
                    >
                      <div class="flex items-center gap-2">
                        {dragHandle}
                        <Input
                          class="w-40"
                          value={action.name}
                          onInput={(e) =>
                            setActions(
                              updateAt(s.customActions, ci, { name: e.currentTarget.value }),
                            )
                          }
                        />
                        <span class="rounded-md bg-surface-hover px-2 py-0.5 text-xs font-medium uppercase text-muted">
                          {action.type}
                        </span>
                        <Select
                          title="Opens in"
                          value={action.open ?? 'tab'}
                          onChange={(e) =>
                            setActions(
                              updateAt(s.customActions, ci, {
                                open: e.currentTarget.value as OpenMode,
                              }),
                            )
                          }
                        >
                          {(Object.keys(OPEN_MODE_LABELS) as OpenMode[]).map((m) => (
                            <option key={m} value={m}>
                              {OPEN_MODE_LABELS[m]}
                            </option>
                          ))}
                        </Select>
                        <div class="ml-auto flex items-center gap-2">
                          <Switch
                            title="Enabled"
                            checked={action.enabled}
                            onChange={(v) =>
                              setActions(updateAt(s.customActions, ci, { enabled: v }))
                            }
                          />
                          <Button
                            variant="danger"
                            class="px-2"
                            title="Remove"
                            onClick={() => setActions(s.customActions.filter((_, j) => j !== ci))}
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        class="mt-2 h-16 w-full font-mono text-xs"
                        value={action.template}
                        onInput={(e) =>
                          setActions(
                            updateAt(s.customActions, ci, { template: e.currentTarget.value }),
                          )
                        }
                      />
                      <div class="mt-2 flex items-center gap-2">
                        {action.icon ? (
                          <SvgIcon markup={action.icon} class="h-5 w-5 shrink-0 text-ink" />
                        ) : (
                          <span class="flex h-5 w-5 shrink-0 items-center justify-center text-ink">
                            <IconBolt />
                          </span>
                        )}
                        <Input
                          class="flex-1"
                          placeholder="Icon: SVG URL or <svg> markup"
                          value={iconInput[action.id] ?? ''}
                          onInput={(e) =>
                            setIconInput((v) => ({ ...v, [action.id]: e.currentTarget.value }))
                          }
                        />
                        <Button variant="primary" class="px-2" onClick={() => applyIcon(action.id)}>
                          Set icon
                        </Button>
                        {action.icon && (
                          <Button
                            variant="danger"
                            class="px-2"
                            title="Clear icon"
                            onClick={() => clearIcon(ci, action.id)}
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                      {iconErr[action.id] && (
                        <p class="mt-1 text-xs text-red-500">{iconErr[action.id]}</p>
                      )}
                    </div>
                  )
                }

                const k = t as keyof Settings['builtins']
                return (
                  <div
                    key={k}
                    {...dropProps}
                    class={`flex items-center gap-2 rounded-md border border-line bg-surface-hover/50 p-2 ${indent} ${dnd}`}
                  >
                    {dragHandle}
                    <span class="flex-1 text-sm text-ink">{BUILTIN_LABELS[k]}</span>
                    <Switch
                      title="Enabled"
                      checked={s.builtins[k]}
                      onChange={(v) => update({ builtins: { ...s.builtins, [k]: v } })}
                    />
                  </div>
                )
              })}
            </div>
            <div class="mt-3 flex gap-2">
              <Button variant="primary" onClick={() => addAction('url')}>
                + URL action
              </Button>
              <Button variant="primary" onClick={() => addAction('js')}>
                + JS action
              </Button>
            </div>
          </Section>

          <Section
            title="Appearance"
            desc="Style the in-page selection popup. Changes preview live below."
          >
            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-3">
                <Row label="Preset">
                  <Select
                    value={a.preset}
                    onChange={(e) => applyPreset(e.currentTarget.value as PresetName)}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="glass">Glass</option>
                    <option value="custom">Custom</option>
                  </Select>
                </Row>

                <div class="grid grid-cols-2 gap-2">
                  <Row label="Icon / text">
                    <input
                      type="color"
                      value={a.fg}
                      onInput={(e) => setAppr({ fg: e.currentTarget.value })}
                      class={swatch}
                    />
                  </Row>
                  <Row label="Accent">
                    <input
                      type="color"
                      value={a.accent}
                      onInput={(e) => setAppr({ accent: e.currentTarget.value })}
                      class={swatch}
                    />
                  </Row>
                  <Row label="Background">
                    <input
                      type="color"
                      value={a.bg}
                      onInput={(e) => setAppr({ bg: e.currentTarget.value })}
                      class={swatch}
                    />
                  </Row>
                  <Row label="Border color">
                    <input
                      type="color"
                      value={a.borderColor}
                      disabled={!a.border}
                      onInput={(e) => setAppr({ borderColor: e.currentTarget.value })}
                      class={swatch}
                    />
                  </Row>
                </div>

                <label class="block text-sm text-ink">
                  Background opacity{' '}
                  <span class="text-muted">{Math.round(a.bgOpacity * 100)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={a.bgOpacity}
                    onInput={(e) => setAppr({ bgOpacity: +e.currentTarget.value })}
                    class={slider}
                  />
                </label>
                <label class="block text-sm text-ink">
                  Background blur <span class="text-muted">{a.blur}px</span>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={a.blur}
                    onInput={(e) => setAppr({ blur: +e.currentTarget.value })}
                    class={slider}
                  />
                </label>
                <label class="block text-sm text-ink">
                  Roundness <span class="text-muted">{a.radius}px</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={a.radius}
                    onInput={(e) => setAppr({ radius: +e.currentTarget.value })}
                    class={slider}
                  />
                </label>
                <Row label="Corner shape">
                  <Select
                    value={a.cornerShape}
                    onChange={(e) =>
                      setAppr({ cornerShape: e.currentTarget.value as Appearance['cornerShape'] })
                    }
                  >
                    <option value="round">Round</option>
                    <option value="squircle">Squircle</option>
                  </Select>
                </Row>
                <label class="block text-sm text-ink">
                  Size <span class="text-muted">{Math.round(a.scale * 100)}%</span>
                  <input
                    type="range"
                    min="0.8"
                    max="1.6"
                    step="0.05"
                    value={a.scale}
                    onInput={(e) => setAppr({ scale: +e.currentTarget.value })}
                    class={slider}
                  />
                </label>
                <label class="block text-sm text-ink">
                  Max width <span class="text-muted">{a.maxWidth}px</span>
                  <input
                    type="range"
                    min="240"
                    max="640"
                    step="8"
                    value={a.maxWidth}
                    onInput={(e) => setAppr({ maxWidth: +e.currentTarget.value })}
                    class={slider}
                  />
                </label>

                <div class="flex gap-6">
                  <Switch
                    label="Border"
                    checked={a.border}
                    onChange={(v) => setAppr({ border: v })}
                  />
                  <Switch
                    label="Shadow"
                    checked={a.shadow}
                    onChange={(v) => setAppr({ shadow: v })}
                  />
                </div>

                <div class="border-t border-line pt-3">
                  <div class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                    Position
                  </div>
                  <Row label="Anchor">
                    <Select
                      value={a.anchor}
                      onChange={(e) =>
                        setAppr({ anchor: e.currentTarget.value as Appearance['anchor'] }, false)
                      }
                    >
                      <option value="auto">Auto</option>
                      <option value="above">Above selection</option>
                      <option value="below">Below selection</option>
                    </Select>
                  </Row>
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    <Row label="Offset X">
                      <Input
                        type="number"
                        value={a.offsetX}
                        onInput={(e) => setAppr({ offsetX: +e.currentTarget.value || 0 }, false)}
                        class="w-20"
                      />
                    </Row>
                    <Row label="Offset Y">
                      <Input
                        type="number"
                        value={a.offsetY}
                        onInput={(e) => setAppr({ offsetY: +e.currentTarget.value || 0 }, false)}
                        class="w-20"
                      />
                    </Row>
                  </div>
                </div>
              </div>

              <div
                class="relative flex items-start justify-center rounded-lg p-6"
                style={previewBg}
              >
                <PreviewBgToggle light={previewLight} onToggle={togglePreview} />
                <div class="stp-panel w-max font-sans" style={appearanceStyle(a)}>
                  <div class="flex flex-wrap items-center gap-0.5 p-1">
                    <span class="stp-btn flex h-8 w-8 items-center justify-center">
                      <IconSearch />
                    </span>
                    <span class="stp-btn flex h-8 w-8 items-center justify-center">
                      <IconCopy />
                    </span>
                    <span class="stp-btn flex h-8 w-8 items-center justify-center">
                      <IconTranslate />
                    </span>
                    <span class="stp-btn flex h-8 w-8 items-center justify-center">
                      <IconBook />
                    </span>
                  </div>
                  <div class="px-3 py-2" style={{ borderTop: 'var(--stp-border)' }}>
                    <div class="stp-muted text-[11px] font-medium uppercase tracking-wide">
                      English → Bengali
                    </div>
                    <div class="text-sm">নমুনা অনুবাদ</div>
                    <div class="stp-accent-text mt-0.5 text-[11px]">syn: sample, example</div>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section
            title="Selection handles"
            desc="Mobile-style carets at each end of a selection; drag them to expand or shrink it. Changes preview live."
          >
            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-3">
                <Switch
                  label="Show drag handles on selection"
                  checked={hh.enabled}
                  onChange={(v) => setHandles({ enabled: v })}
                />
                <Row label="Color">
                  <input
                    type="color"
                    value={hh.color}
                    disabled={!hh.enabled}
                    onInput={(e) => setHandles({ color: e.currentTarget.value })}
                    class={swatch}
                  />
                </Row>
                <label class="block text-sm text-ink">
                  Opacity <span class="text-muted">{Math.round(hh.opacity * 100)}%</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={hh.opacity}
                    disabled={!hh.enabled}
                    onInput={(e) => setHandles({ opacity: +e.currentTarget.value })}
                    class={slider}
                  />
                </label>
                <label class="block text-sm text-ink">
                  Thickness <span class="text-muted">{hh.thickness}px</span>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="1"
                    value={hh.thickness}
                    disabled={!hh.enabled}
                    onInput={(e) => setHandles({ thickness: +e.currentTarget.value })}
                    class={slider}
                  />
                </label>
                <label class="block text-sm text-ink">
                  Size <span class="text-muted">{Math.round(hh.size * 100)}%</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.05"
                    value={hh.size}
                    disabled={!hh.enabled}
                    onInput={(e) => setHandles({ size: +e.currentTarget.value })}
                    class={slider}
                  />
                </label>
              </div>

              <div
                class="relative flex items-center justify-center rounded-lg p-6"
                style={previewBg}
              >
                <PreviewBgToggle light={previewLight} onToggle={togglePreview} />
                <div
                  class={`select-none font-sans text-base leading-[24px] ${previewLight ? 'text-slate-800' : 'text-white'}`}
                >
                  Drag the{' '}
                  <span
                    class="relative"
                    style={{ background: hexToRgba(hh.color, 0.28), padding: '0 1px' }}
                  >
                    <span style={{ position: 'absolute', left: '0', top: '0' }}>
                      <Handle side="start" h={hh} height={24} />
                    </span>
                    selected text
                    <span style={{ position: 'absolute', right: '0', top: '0' }}>
                      <Handle side="end" h={hh} height={24} />
                    </span>
                  </span>{' '}
                  to resize.
                </div>
              </div>
            </div>
          </Section>

          <Section
            title="Search engines"
            desc="Pick the default and toggle which are available."
            footnote={
              <>
                Use <code>%s</code> where the selected text should go.
              </>
            }
          >
            <div class="space-y-2">
              {s.search.engines.map((eng, i) => (
                <div key={eng.id} class="flex items-center gap-2">
                  <input
                    type="radio"
                    name="default-engine"
                    checked={s.search.defaultEngineId === eng.id}
                    onChange={() => update({ search: { ...s.search, defaultEngineId: eng.id } })}
                    title="Set as default"
                    class="h-4 w-4 accent-accent"
                  />
                  <Input
                    class="w-28"
                    value={eng.name}
                    onInput={(e) =>
                      setEngines(updateAt(s.search.engines, i, { name: e.currentTarget.value }))
                    }
                  />
                  <Input
                    class="flex-1"
                    value={eng.url}
                    placeholder="https://…/?q=%s"
                    onInput={(e) =>
                      setEngines(updateAt(s.search.engines, i, { url: e.currentTarget.value }))
                    }
                  />
                  <Switch
                    title="Enabled"
                    checked={eng.enabled}
                    onChange={(v) => setEngines(updateAt(s.search.engines, i, { enabled: v }))}
                  />
                  <Button
                    variant="danger"
                    class="px-2"
                    title="Remove"
                    onClick={() => setEngines(s.search.engines.filter((_, j) => j !== i))}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="primary" onClick={addEngine}>
              + Add engine
            </Button>
          </Section>

          <Section title="Translate" divided>
            <Row label="Target language">
              <Select
                value={s.translate.targetLang}
                onChange={(e) =>
                  update({ translate: { ...s.translate, targetLang: e.currentTarget.value } })
                }
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Row>
            <Switch
              label="Open in a separate Google Translate window instead of inline"
              checked={s.translate.openInWindow}
              onChange={(v) => update({ translate: { ...s.translate, openInWindow: v } })}
            />
          </Section>

          <Section title="Dictionary" divided>
            <Row label="Language">
              <Select
                value={s.dictionary.lang}
                onChange={(e) =>
                  update({ dictionary: { ...s.dictionary, lang: e.currentTarget.value } })
                }
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Row>
          </Section>

          <Section
            title="Currency"
            desc="Rates from frankfurter.dev (ECB); currencies outside that set (e.g. BDT) use open.er-api.com. Source is auto-detected from the selection; base below is the fallback when none is found."
            divided
          >
            <Row label="Fallback base">
              <Select
                value={s.currency.base}
                onChange={(e) =>
                  update({ currency: { ...s.currency, base: e.currentTarget.value } })
                }
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Row>
            <Row label="Convert to">
              <Select
                value={s.currency.target}
                onChange={(e) =>
                  update({ currency: { ...s.currency, target: e.currentTarget.value } })
                }
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Row>
          </Section>

          <Section
            title="Feedback"
            desc="Request a feature, report a bug, or send a recommendation. We currently have 0 known issues."
          >
            <p class="text-sm text-ink">{feedbackMsg}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => window.open(CHROME_STORE_URL, '_blank')}>
                ★ Rate on Chrome Web Store
              </Button>
              <Button onClick={() => window.open(GITHUB_ISSUES_URL, '_blank')}>
                Report an issue on GitHub
              </Button>
            </div>
          </Section>

          <Section
            title="Feature Request"
            desc="Missing an action or want the popup to do something new? Tell us exactly what you need and why — the clearer the request, the sooner it can ship."
            footnote="Opens a prefilled GitHub issue. Include: what you want, why it helps, and how you imagine it working."
          >
            <p class="text-sm text-ink">
              Have an idea for a new action, setting, or workflow? We build the extension around
              real requests — describe your use case and we will look into it.
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => window.open(CHROME_STORE_URL, '_blank')}>
                Request in the extension support thread
              </Button>
              <Button onClick={() => window.open(GITHUB_FEATURE_URL, '_blank')}>
                Request a feature on GitHub
              </Button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
