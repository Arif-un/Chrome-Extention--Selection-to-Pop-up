import type { Settings } from './types'
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from './defaults'
import { isSupportedCurrency } from './langs'

const KEY = 'settings'

/** Legacy MV2 keys used by v1.x installs. */
interface LegacyConfig {
  primaryTranslate?: string
  primaryCurrency?: string
  pop_win?: boolean
}

function deepMerge<T>(base: T, patch: Partial<T> | undefined): T {
  if (!patch) return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const cur = (base as Record<string, unknown>)[k]
    const bothObjects =
      v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' && !Array.isArray(cur)
    if (bothObjects) {
      out[k] = deepMerge(cur, v as Record<string, unknown>)
    } else if (v !== undefined) {
      out[k] = v
    }
  }
  return out as T
}

/** Build a settings object from legacy v1.x keys (best-effort). */
export function migrateLegacy(legacy: LegacyConfig): Partial<Settings> {
  const patch: Partial<Settings> = {}
  if (legacy.primaryTranslate) patch.translate = { ...DEFAULT_SETTINGS.translate, targetLang: legacy.primaryTranslate }
  // legacy currency (often BDT) may be unsupported by frankfurter.dev; only carry it over if valid
  if (legacy.primaryCurrency && isSupportedCurrency(legacy.primaryCurrency)) {
    patch.currency = { ...DEFAULT_SETTINGS.currency, target: legacy.primaryCurrency.toUpperCase() }
  }
  if (typeof legacy.pop_win === 'boolean') {
    patch.translate = { ...(patch.translate ?? DEFAULT_SETTINGS.translate), openInWindow: legacy.pop_win }
  }
  return patch
}

/** Read settings, applying defaults and a one-time legacy migration. */
export async function getSettings(): Promise<Settings> {
  const raw = await chrome.storage.sync.get([KEY, 'primaryTranslate', 'primaryCurrency', 'pop_win'])
  let stored = raw[KEY] as Settings | undefined

  if (!stored) {
    const legacyPatch = migrateLegacy(raw as LegacyConfig)
    stored = deepMerge(DEFAULT_SETTINGS, legacyPatch)
    await chrome.storage.sync.set({ [KEY]: stored })
    // clear legacy keys so migration runs only once
    await chrome.storage.sync.remove(['primaryTranslate', 'primaryCurrency', 'pop_win'])
    return stored
  }

  // fill any newly-added fields from defaults; bump schema if needed
  const merged = deepMerge(DEFAULT_SETTINGS, stored)
  if (merged.schema !== SCHEMA_VERSION) {
    merged.schema = SCHEMA_VERSION
    await chrome.storage.sync.set({ [KEY]: merged })
  }
  return merged
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const next = deepMerge(current, patch)
  await chrome.storage.sync.set({ [KEY]: next })
  return next
}

export function onSettingsChange(cb: (s: Settings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'sync' && changes[KEY]?.newValue) cb(changes[KEY].newValue as Settings)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

export { deepMerge }
