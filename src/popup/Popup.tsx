import { setSettings } from '../lib/settings'
import { useSettings } from '../lib/useSettings'
import { BUILTIN_KEYS, BUILTIN_LABELS } from '../lib/builtins'
import { langName } from '../lib/langs'
import { Button } from '../components/ui/Button'
import { Switch } from '../components/ui/Switch'

export function Popup() {
  const [settings, setLocal] = useSettings()

  if (!settings) return <div class="w-72 p-4 text-sm text-muted">Loading…</div>

  const toggleTrigger = async () => {
    const next = await setSettings({ trigger: { onSelection: !settings.trigger.onSelection } })
    setLocal(next)
  }
  const enabled = BUILTIN_KEYS.filter((k) => settings.builtins[k])

  return (
    <div class="w-72 space-y-3 bg-canvas p-4 text-ink">
      <h1 class="text-base font-semibold">Selection To Popup</h1>

      <label class="flex cursor-pointer items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm">
        <span>Show popup on selection</span>
        <Switch
          title="Show popup on selection"
          checked={settings.trigger.onSelection}
          onChange={toggleTrigger}
        />
      </label>

      <div class="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
        <div class="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          Enabled actions
        </div>
        <div class="flex flex-wrap gap-1.5">
          {enabled.length === 0 && <span class="text-muted">None</span>}
          {enabled.map((k) => (
            <span key={k} class="rounded-md bg-surface-hover px-2 py-0.5 text-xs text-ink">
              {BUILTIN_LABELS[k]}
            </span>
          ))}
        </div>
        <div class="mt-2 text-xs text-muted">
          Translate → {langName(settings.translate.targetLang)} · Currency → {settings.currency.target}
        </div>
      </div>

      <Button variant="primary" class="w-full" onClick={() => chrome.runtime.openOptionsPage()}>
        Open settings
      </Button>
    </div>
  )
}
