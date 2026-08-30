/** Where a URL action opens. Mirrors the translate "open in window" pattern. */
export type OpenMode = 'tab' | 'miniWindow' | 'window' | 'sidebar'

export const OPEN_MODE_LABELS: Record<OpenMode, string> = {
  tab: 'New tab',
  miniWindow: 'Mini window',
  window: 'New window',
  sidebar: 'Sidebar',
}

/** Popup dimensions for the window modes, or null for tab/sidebar (no popup). */
export function popupSize(mode: OpenMode): { w: number; h: number } | null {
  if (mode === 'miniWindow') return { w: 480, h: 640 }
  if (mode === 'window') return { w: 1024, h: 768 }
  return null
}

/** window.open() features string for a popup centered on the given screen. */
export function popupFeatures(w: number, h: number, screenW: number, screenH: number): string {
  const left = Math.max(0, Math.round((screenW - w) / 2))
  const top = Math.max(0, Math.round((screenH - h) / 2))
  return `popup,width=${w},height=${h},left=${left},top=${top}`
}
