import { useState } from 'preact/hooks'
import { setSettings } from '../lib/settings'
import type { Command } from '../lib/messages'
import { useSettings } from '../lib/useSettings'
import { randomFeedbackMessage } from '../lib/feedback'
import { Button } from '../components/ui/Button'
import { Switch } from '../components/ui/Switch'
import logo from '../assets/icons/select-logo-32.png'

const openFeedback = () =>
  chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html#feedback') })

// Re-show the in-page action popup for the tab's current selection, then close
// the toolbar popup so the tooltip is visible. Opening this popup doesn't clear
// the page selection, so anchorFor() in the content script still finds it.
const showOnSelection = () =>
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id)
      chrome.tabs
        .sendMessage(tab.id, { type: 'TRIGGER_SELECTION' } satisfies Command)
        .catch(() => {})
    window.close()
  })

export function Popup() {
  const [settings, setLocal] = useSettings()
  const [feedbackMsg] = useState(randomFeedbackMessage)

  if (!settings) return <div class="w-72 p-4 text-sm text-muted">Loading…</div>

  const toggleTrigger = async () => {
    const next = await setSettings({ trigger: { onSelection: !settings.trigger.onSelection } })
    setLocal(next)
  }

  return (
    <div class="w-72 space-y-3 bg-canvas p-4 text-ink">
      <h1 class="flex items-center gap-2 text-base font-semibold">
        <img src={logo} alt="" class="h-6 w-6" />
        Select to Action
      </h1>

      <label class="flex cursor-pointer items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm">
        <span>Show popup on selection</span>
        <Switch
          title="Show popup on selection"
          checked={settings.trigger.onSelection}
          onChange={toggleTrigger}
        />
      </label>

      <Button variant="outline" class="w-full" onClick={showOnSelection}>
        Show actions for current selection
      </Button>

      <Button variant="primary" class="w-full" onClick={() => chrome.runtime.openOptionsPage()}>
        Open settings
      </Button>

      <div class="rounded-lg border border-line bg-surface px-3 py-2">
        <p class="text-xs text-muted">{feedbackMsg}</p>
        <Button class="mt-2 w-full" onClick={openFeedback}>
          Feedback
        </Button>
      </div>
    </div>
  )
}
