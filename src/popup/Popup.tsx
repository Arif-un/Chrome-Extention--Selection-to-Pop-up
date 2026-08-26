import { setSettings } from '../lib/settings'
import { useSettings } from '../lib/useSettings'
import { BUILTIN_KEYS, BUILTIN_LABELS } from '../lib/builtins'
import { langName } from '../lib/langs'

export function Popup() {
  const [settings, setLocal] = useSettings()

  if (!settings) return <div class="w-72 p-4 text-sm text-slate-400">Loading…</div>

  const toggleTrigger = async () => {
    const next = await setSettings({ trigger: { onSelection: !settings.trigger.onSelection } })
    setLocal(next)
  }
  const enabled = BUILTIN_KEYS.filter((k) => settings.builtins[k])

  return (
    <div class="w-72 space-y-3 p-4">
      <h1 class="text-base font-semibold">Selection To Popup</h1>

      <label class="flex cursor-pointer items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
        <span>Show popup on selection</span>
        <input
          type="checkbox"
          checked={settings.trigger.onSelection}
          onChange={toggleTrigger}
          class="h-4 w-4 accent-sky-500"
        />
      </label>

      <div class="rounded-md bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
        <div class="mb-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Enabled actions
        </div>
        <div class="flex flex-wrap gap-1.5">
          {enabled.length === 0 && <span class="text-slate-500">None</span>}
          {enabled.map((k) => (
            <span
              key={k}
              class="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-white"
            >
              {BUILTIN_LABELS[k]}
            </span>
          ))}
        </div>
        <div class="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Translate → {langName(settings.translate.targetLang)} · Currency →{' '}
          {settings.currency.target}
        </div>
      </div>

      <button
        type="button"
        onClick={() => chrome.runtime.openOptionsPage()}
        class="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500"
      >
        Open settings
      </button>
    </div>
  )
}
