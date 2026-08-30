/** Guided-tour step: a CSS selector to spotlight plus the copy shown beside it. */
export interface TourStep {
  /** CSS selector for the element to highlight (section id or a data-tour hook). */
  target: string
  title: string
  body: string
}

/** Core walkthrough of the settings page: the four sections that matter, then Save. */
export const TOUR_STEPS: TourStep[] = [
  {
    target: '#trigger',
    title: 'Trigger',
    body: 'Pick how the popup shows up: automatically when you select text, or only via the right-click menu and the Alt+S shortcut.',
  },
  {
    target: '#actions',
    title: 'Actions',
    body: 'One list drives the popup. Toggle built-ins, add custom URL/JS or AI actions, and drag to reorder. Anything below the ⋯ divider hides in the overflow menu.',
  },
  {
    target: '#appearance',
    title: 'Appearance',
    body: 'Style the in-page popup — colors, blur, roundness, size and position. The preview on the right updates live.',
  },
  {
    target: '#search-engines',
    title: 'Search engines',
    body: 'Choose the default engine and toggle which ones are available. Use %s where the selected text should go.',
  },
  {
    target: '[data-tour="save"]',
    title: "Don't forget to Save",
    body: 'Changes only apply once you hit Save. That’s it — you can reopen this tour any time from the header.',
  },
]

/** chrome.storage.local key marking the settings tour as already shown. */
export const TOUR_SEEN_KEY = 'stp-tour-seen'

/** Has the tour auto-run before? (Only ever auto-runs once, per device.) */
export async function tourSeen(): Promise<boolean> {
  const r = await chrome.storage.local.get(TOUR_SEEN_KEY)
  return !!r[TOUR_SEEN_KEY]
}

export async function markTourSeen(): Promise<void> {
  await chrome.storage.local.set({ [TOUR_SEEN_KEY]: true })
}

/** Keep a step index inside [0, len). */
export const clampStep = (i: number, len: number): number => Math.max(0, Math.min(i, len - 1))
