import { useRef, useState } from 'preact/hooks'
import { setSettings } from '../lib/settings'
import { useSettings } from '../lib/useSettings'
import { DEFAULT_SETTINGS } from '../lib/defaults'
import { updateAt } from '../lib/arr'
import { BUILTIN_KEYS, BUILTIN_LABELS } from '../lib/builtins'
import type { Settings, SearchEngine, CustomAction } from '../lib/types'
import { LANGS, CURRENCIES } from '../lib/langs'
import { PRESETS, appearanceStyle, hexToRgba, type Appearance, type PresetName } from '../lib/appearance'
import type { SelectionHandles } from '../lib/handles'
import { Handle } from '../content/Handle'
import { Section } from '../components/Section'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { Switch } from '../components/ui/Switch'
import { Row } from '../components/ui/Row'
import { ThemeToggle } from '../components/ThemeToggle'
import { IconSearch, IconCopy, IconTranslate, IconBook } from '../content/icons'

const swatch = 'h-7 w-10 shrink-0 cursor-pointer rounded-md border border-line bg-transparent disabled:opacity-40'
const slider = 'w-full accent-accent'

export function Options() {
  const [s, setS] = useSettings()
  const [saved, setSaved] = useState(false)
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
    const next = await setSettings(patch)
    baseline.current = next
    setS(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
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
  const setActions = (customActions: CustomAction[]) => update({ customActions })
  const addAction = (type: CustomAction['type']) =>
    setActions([
      ...s.customActions,
      {
        id: crypto.randomUUID(),
        name: type === 'url' ? 'New link action' : 'New JS action',
        type,
        template: type === 'url' ? 'https://example.com/?q=%s' : 'return input.text.toUpperCase()',
        enabled: true,
      },
    ])

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

  return (
    <div class="mx-auto max-w-2xl space-y-6 p-6">
      <header class="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-line bg-canvas/80 px-6 py-3 backdrop-blur">
        <div>
          <h1 class="text-lg font-semibold text-ink">Select to Action</h1>
          <p class="text-xs text-muted">Settings</p>
        </div>
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <Button onClick={reset}>Reset</Button>
          <Button variant="primary" onClick={save} disabled={!dirty}>
            {saved ? 'Saved ✓' : 'Save'}
          </Button>
        </div>
      </header>

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

      <Section title="Actions" desc="Which built-in actions appear in the popup.">
        <div class="grid grid-cols-2 gap-x-4 gap-y-3">
          {BUILTIN_KEYS.map((k) => (
            <Switch
              key={k}
              label={BUILTIN_LABELS[k]}
              checked={s.builtins[k]}
              onChange={(v) => update({ builtins: { ...s.builtins, [k]: v } })}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Appearance"
        desc="Style the in-page selection popup. Changes preview live below."
      >
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-3">
            <Row label="Preset">
              <Select value={a.preset} onChange={(e) => applyPreset(e.currentTarget.value as PresetName)}>
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
                max="24"
                step="1"
                value={a.radius}
                onInput={(e) => setAppr({ radius: +e.currentTarget.value })}
                class={slider}
              />
            </label>
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

            <div class="flex gap-6">
              <Switch label="Border" checked={a.border} onChange={(v) => setAppr({ border: v })} />
              <Switch label="Shadow" checked={a.shadow} onChange={(v) => setAppr({ shadow: v })} />
            </div>

            <div class="border-t border-line pt-3">
              <div class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Position</div>
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
            class="flex items-start justify-center rounded-lg p-6"
            style={{
              backgroundColor: '#0b1220',
              backgroundImage:
                'linear-gradient(45deg, #131c2e 25%, transparent 25%), linear-gradient(-45deg, #131c2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #131c2e 75%), linear-gradient(-45deg, transparent 75%, #131c2e 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
            }}
          >
            <div class="stp-panel w-max font-sans" style={appearanceStyle(a)}>
              <div class="flex items-center gap-0.5 p-1">
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
            class="flex items-center justify-center rounded-lg p-6"
            style={{
              backgroundColor: '#0b1220',
              backgroundImage:
                'linear-gradient(45deg, #131c2e 25%, transparent 25%), linear-gradient(-45deg, #131c2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #131c2e 75%), linear-gradient(-45deg, transparent 75%, #131c2e 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
            }}
          >
            <div class="select-none font-sans text-base leading-[24px] text-white">
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
            onChange={(e) => update({ dictionary: { ...s.dictionary, lang: e.currentTarget.value } })}
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
            onChange={(e) => update({ currency: { ...s.currency, base: e.currentTarget.value } })}
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
            onChange={(e) => update({ currency: { ...s.currency, target: e.currentTarget.value } })}
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
        title="Custom actions"
        desc="Add your own buttons: a URL template or a sandboxed JS snippet."
        footnote={
          <>
            URL: use <code>%s</code> for the selection. JS: a function body with <code>input</code> ={' '}
            <code>{'{ text, url, title }'}</code> in scope; <code>return</code> a string (shown) or an{' '}
            <code>http(s)</code> URL (opened). Runs sandboxed — no page or extension access.
          </>
        }
      >
        <div class="space-y-3">
          {s.customActions.map((action, i) => (
            <div key={action.id} class="rounded-lg border border-line bg-surface-hover/50 p-2.5">
              <div class="flex items-center gap-2">
                <Input
                  class="w-40"
                  value={action.name}
                  onInput={(e) =>
                    setActions(updateAt(s.customActions, i, { name: e.currentTarget.value }))
                  }
                />
                <span class="rounded-md bg-surface-hover px-2 py-0.5 text-xs font-medium uppercase text-muted">
                  {action.type}
                </span>
                <div class="ml-auto flex items-center gap-2">
                  <Switch
                    title="Enabled"
                    checked={action.enabled}
                    onChange={(v) => setActions(updateAt(s.customActions, i, { enabled: v }))}
                  />
                  <Button
                    variant="danger"
                    class="px-2"
                    title="Remove"
                    onClick={() => setActions(s.customActions.filter((_, j) => j !== i))}
                  >
                    ✕
                  </Button>
                </div>
              </div>
              <Textarea
                class="mt-2 h-16 w-full font-mono text-xs"
                value={action.template}
                onInput={(e) =>
                  setActions(updateAt(s.customActions, i, { template: e.currentTarget.value }))
                }
              />
            </div>
          ))}
        </div>
        <div class="flex gap-2">
          <Button variant="primary" onClick={() => addAction('url')}>
            + URL action
          </Button>
          <Button variant="primary" onClick={() => addAction('js')}>
            + JS action
          </Button>
        </div>
      </Section>
    </div>
  )
}
