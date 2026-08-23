import { useRef, useState } from 'preact/hooks'
import { setSettings } from '../lib/settings'
import { useSettings } from '../lib/useSettings'
import { DEFAULT_SETTINGS } from '../lib/defaults'
import { updateAt } from '../lib/arr'
import { BUILTIN_KEYS, BUILTIN_LABELS } from '../lib/builtins'
import type { Settings, SearchEngine, CustomAction } from '../lib/types'
import { LANGS, CURRENCIES } from '../lib/langs'
import { PRESETS, appearanceStyle, type Appearance, type PresetName } from '../lib/appearance'
import { Section } from '../components/Section'
import { Check } from '../components/Check'
import { IconSearch, IconCopy, IconTranslate, IconBook } from '../content/icons'

const input =
  'rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500'

export function Options() {
  const [s, setS] = useSettings()
  const [saved, setSaved] = useState(false)
  // storage snapshot as loaded; used to save only edited sections so a concurrent
  // write elsewhere (e.g. the popup toggling trigger.onSelection) isn't clobbered.
  const baseline = useRef<Settings | null>(null)
  if (s && !baseline.current) baseline.current = s

  if (!s) return <div class="p-8 text-slate-400">Loading…</div>

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
      { id: crypto.randomUUID(), name: 'New engine', url: 'https://example.com/?q=%s', enabled: true },
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
        template: type === 'url' ? 'https://example.com/?q=%s' : "return input.text.toUpperCase()",
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

  return (
    <div class="mx-auto max-w-2xl space-y-4 p-6">
      <header class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold text-white">Selection To PopUp</h1>
          <p class="text-xs text-slate-400">Settings</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onClick={reset} class="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">
            Reset
          </button>
          <button type="button" onClick={save} class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500">
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </header>

      <Section title="Trigger">
        <Check label="Show popup automatically on text selection" checked={s.trigger.onSelection} onChange={(v) => update({ trigger: { onSelection: v } })} />
        <p class="text-xs text-slate-500">Context menu and the keyboard shortcut (Alt+S, editable at chrome://extensions/shortcuts) always work.</p>
      </Section>

      <Section title="Actions" desc="Which built-in actions appear in the popup.">
        <div class="grid grid-cols-2 gap-2">
          {BUILTIN_KEYS.map((k) => (
            <Check key={k} label={BUILTIN_LABELS[k]} checked={s.builtins[k]} onChange={(v) => update({ builtins: { ...s.builtins, [k]: v } })} />
          ))}
        </div>
      </Section>

      <Section title="Appearance" desc="Style the in-page selection popup. Changes preview live below.">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-3">
            <label class="flex items-center justify-between gap-2 text-sm">
              Preset
              <select class={input} value={a.preset} onChange={(e) => applyPreset(e.currentTarget.value as PresetName)}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="glass">Glass</option>
                <option value="custom">Custom</option>
              </select>
            </label>

            <div class="grid grid-cols-2 gap-2">
              <label class="flex items-center justify-between gap-2 text-sm">
                Icon / text
                <input type="color" value={a.fg} onInput={(e) => setAppr({ fg: e.currentTarget.value })} class="h-7 w-10 rounded bg-transparent" />
              </label>
              <label class="flex items-center justify-between gap-2 text-sm">
                Accent
                <input type="color" value={a.accent} onInput={(e) => setAppr({ accent: e.currentTarget.value })} class="h-7 w-10 rounded bg-transparent" />
              </label>
              <label class="flex items-center justify-between gap-2 text-sm">
                Background
                <input type="color" value={a.bg} onInput={(e) => setAppr({ bg: e.currentTarget.value })} class="h-7 w-10 rounded bg-transparent" />
              </label>
              <label class="flex items-center justify-between gap-2 text-sm">
                Border color
                <input type="color" value={a.borderColor} disabled={!a.border} onInput={(e) => setAppr({ borderColor: e.currentTarget.value })} class="h-7 w-10 rounded bg-transparent disabled:opacity-40" />
              </label>
            </div>

            <label class="block text-sm">
              Background opacity <span class="text-slate-400">{Math.round(a.bgOpacity * 100)}%</span>
              <input type="range" min="0" max="1" step="0.01" value={a.bgOpacity} onInput={(e) => setAppr({ bgOpacity: +e.currentTarget.value })} class="w-full accent-sky-500" />
            </label>
            <label class="block text-sm">
              Background blur <span class="text-slate-400">{a.blur}px</span>
              <input type="range" min="0" max="30" step="1" value={a.blur} onInput={(e) => setAppr({ blur: +e.currentTarget.value })} class="w-full accent-sky-500" />
            </label>
            <label class="block text-sm">
              Roundness <span class="text-slate-400">{a.radius}px</span>
              <input type="range" min="0" max="24" step="1" value={a.radius} onInput={(e) => setAppr({ radius: +e.currentTarget.value })} class="w-full accent-sky-500" />
            </label>
            <label class="block text-sm">
              Size <span class="text-slate-400">{Math.round(a.scale * 100)}%</span>
              <input type="range" min="0.8" max="1.6" step="0.05" value={a.scale} onInput={(e) => setAppr({ scale: +e.currentTarget.value })} class="w-full accent-sky-500" />
            </label>

            <div class="flex gap-4">
              <Check label="Border" checked={a.border} onChange={(v) => setAppr({ border: v })} />
              <Check label="Shadow" checked={a.shadow} onChange={(v) => setAppr({ shadow: v })} />
            </div>

            <div class="border-t border-slate-800 pt-3">
              <div class="mb-2 text-xs uppercase tracking-wide text-slate-400">Position</div>
              <label class="flex items-center justify-between gap-2 text-sm">
                Anchor
                <select class={input} value={a.anchor} onChange={(e) => setAppr({ anchor: e.currentTarget.value as Appearance['anchor'] }, false)}>
                  <option value="auto">Auto</option>
                  <option value="above">Above selection</option>
                  <option value="below">Below selection</option>
                </select>
              </label>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <label class="flex items-center justify-between gap-2 text-sm">
                  Offset X
                  <input type="number" value={a.offsetX} onInput={(e) => setAppr({ offsetX: +e.currentTarget.value || 0 }, false)} class={`${input} w-20`} />
                </label>
                <label class="flex items-center justify-between gap-2 text-sm">
                  Offset Y
                  <input type="number" value={a.offsetY} onInput={(e) => setAppr({ offsetY: +e.currentTarget.value || 0 }, false)} class={`${input} w-20`} />
                </label>
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
                <span class="stp-btn flex h-8 w-8 items-center justify-center"><IconSearch /></span>
                <span class="stp-btn flex h-8 w-8 items-center justify-center"><IconCopy /></span>
                <span class="stp-btn flex h-8 w-8 items-center justify-center"><IconTranslate /></span>
                <span class="stp-btn flex h-8 w-8 items-center justify-center"><IconBook /></span>
              </div>
              <div class="px-3 py-2" style={{ borderTop: 'var(--stp-border)' }}>
                <div class="stp-muted text-[11px] font-medium uppercase tracking-wide">English → Bengali</div>
                <div class="text-sm">নমুনা অনুবাদ</div>
                <div class="stp-accent-text mt-0.5 text-[11px]">syn: sample, example</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Search engines" desc="Pick the default and toggle which are available.">
        <div class="space-y-2">
          {s.search.engines.map((eng, i) => (
            <div key={eng.id} class="flex items-center gap-2">
              <input type="radio" name="default-engine" checked={s.search.defaultEngineId === eng.id} onChange={() => update({ search: { ...s.search, defaultEngineId: eng.id } })} title="Set as default" class="h-4 w-4 accent-sky-500" />
              <input class={`${input} w-28`} value={eng.name} onInput={(e) => setEngines(updateAt(s.search.engines, i, { name: e.currentTarget.value }))} />
              <input class={`${input} flex-1`} value={eng.url} placeholder="https://…/?q=%s" onInput={(e) => setEngines(updateAt(s.search.engines, i, { url: e.currentTarget.value }))} />
              <input type="checkbox" checked={eng.enabled} title="Enabled" onChange={(e) => setEngines(updateAt(s.search.engines, i, { enabled: e.currentTarget.checked }))} class="h-4 w-4 accent-sky-500" />
              <button type="button" onClick={() => setEngines(s.search.engines.filter((_, j) => j !== i))} class="px-1 text-slate-500 hover:text-red-400">✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addEngine} class="text-sm text-sky-400 hover:underline">+ Add engine</button>
        <p class="text-xs text-slate-500">Use <code>%s</code> where the selected text should go.</p>
      </Section>

      <Section title="Translate">
        <label class="flex items-center gap-2 text-sm">
          Target language
          <select class={input} value={s.translate.targetLang} onChange={(e) => update({ translate: { ...s.translate, targetLang: e.currentTarget.value } })}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </label>
        <Check label="Open in a separate Google Translate window instead of inline" checked={s.translate.openInWindow} onChange={(v) => update({ translate: { ...s.translate, openInWindow: v } })} />
      </Section>

      <Section title="Dictionary">
        <label class="flex items-center gap-2 text-sm">
          Language
          <select class={input} value={s.dictionary.lang} onChange={(e) => update({ dictionary: { ...s.dictionary, lang: e.currentTarget.value } })}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </label>
      </Section>

      <Section
        title="Currency"
        desc="Rates from frankfurter.dev (ECB); currencies outside that set (e.g. BDT) use open.er-api.com. Source is auto-detected from the selection; base below is the fallback when none is found."
      >
        <div class="flex items-center gap-3 text-sm">
          <label class="flex items-center gap-2">
            Fallback base
            <select class={input} value={s.currency.base} onChange={(e) => update({ currency: { ...s.currency, base: e.currentTarget.value } })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label class="flex items-center gap-2">
            Convert to
            <select class={input} value={s.currency.target} onChange={(e) => update({ currency: { ...s.currency, target: e.currentTarget.value } })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      <Section title="Custom actions" desc="Add your own buttons: a URL template or a sandboxed JS snippet.">
        <div class="space-y-3">
          {s.customActions.map((a, i) => (
            <div key={a.id} class="rounded-md border border-slate-700 p-2">
              <div class="flex items-center gap-2">
                <input class={`${input} w-40`} value={a.name} onInput={(e) => setActions(updateAt(s.customActions, i, { name: e.currentTarget.value }))} />
                <span class="rounded bg-slate-700 px-2 py-0.5 text-xs uppercase">{a.type}</span>
                <input type="checkbox" checked={a.enabled} title="Enabled" onChange={(e) => setActions(updateAt(s.customActions, i, { enabled: e.currentTarget.checked }))} class="ml-auto h-4 w-4 accent-sky-500" />
                <button type="button" onClick={() => setActions(s.customActions.filter((_, j) => j !== i))} class="px-1 text-slate-500 hover:text-red-400">✕</button>
              </div>
              <textarea class={`${input} mt-2 h-16 w-full font-mono text-xs`} value={a.template} onInput={(e) => setActions(updateAt(s.customActions, i, { template: e.currentTarget.value }))} />
            </div>
          ))}
        </div>
        <div class="flex gap-3">
          <button type="button" onClick={() => addAction('url')} class="text-sm text-sky-400 hover:underline">+ URL action</button>
          <button type="button" onClick={() => addAction('js')} class="text-sm text-sky-400 hover:underline">+ JS action</button>
        </div>
        <p class="text-xs text-slate-500">
          URL: use <code>%s</code> for the selection. JS: a function body with <code>input</code> = <code>{'{ text, url, title }'}</code> in scope; <code>return</code> a string (shown) or an <code>http(s)</code> URL (opened). Runs sandboxed — no page or extension access.
        </p>
      </Section>
    </div>
  )
}
