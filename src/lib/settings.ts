import type { Settings } from './types'
import { AI_ACTION_SINCE, DEFAULT_SETTINGS, ENGINE_SINCE, SCHEMA_VERSION } from './defaults'
import { isSupportedCurrency } from './langs'

const KEY = 'settings'

/** Legacy MV2 keys used by v1.x installs. */
interface LegacyConfig {
  primaryTranslate?: string
  primaryCurrency?: string
  pop_win?: boolean
}

/**
 * True when `v` (a stored value) has a fundamentally different shape than `cur`
 * (the default): object-vs-primitive or array-vs-non-array. Used to reject
 * corrupt/old-typed stored values on load so new code never reads the wrong
 * type. Skipped when the default is null/undefined (its type can't be inferred,
 * e.g. `AiWindow.x: number | null` defaults to null), so legit values survive.
 */
function typeMismatch(cur: unknown, v: unknown): boolean {
  if (cur == null || v == null) return false
  if (Array.isArray(cur) !== Array.isArray(v)) return true
  return typeof cur !== typeof v
}

function deepMerge<T>(base: T, patch: Partial<T> | undefined): T {
  if (!patch) return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const cur = (base as Record<string, unknown>)[k]
    const bothObjects =
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      cur &&
      typeof cur === 'object' &&
      !Array.isArray(cur)
    if (bothObjects) {
      out[k] = deepMerge(cur, v as Record<string, unknown>)
    } else if (v !== undefined && !typeMismatch(cur, v)) {
      // A stored value whose type no longer matches the default is dropped, so
      // the default (already in `out`) stands in — a scalar→object schema change
      // can't feed new code an old-typed value.
      out[k] = v
    }
  }
  return out as T
}

/**
 * deepMerge replaces arrays wholesale with the stored value, so new default
 * array entries never reach existing installs on their own. Append only the
 * defaults introduced AFTER the user's stored schema (by `since`), skipping any
 * the user already has — so a default they deliberately deleted (its `since`
 * predates their schema) is never resurrected. Preserves stored order + edits.
 */
function appendNewBySince<T>(
  current: T[],
  defaults: T[],
  id: (x: T) => string,
  since: Record<string, number>,
  storedSchema: number,
): T[] {
  const have = new Set(current.map(id))
  return [
    ...current,
    ...defaults.filter((d) => !have.has(id(d)) && (since[id(d)] ?? 0) > storedSchema),
  ]
}

/** Build a settings object from legacy v1.x keys (best-effort). */
export function migrateLegacy(legacy: LegacyConfig): Partial<Settings> {
  const patch: Partial<Settings> = {}
  if (legacy.primaryTranslate)
    patch.translate = { ...DEFAULT_SETTINGS.translate, targetLang: legacy.primaryTranslate }
  // legacy currency (often BDT) may be unsupported by frankfurter.dev; only carry it over if valid
  if (legacy.primaryCurrency && isSupportedCurrency(legacy.primaryCurrency)) {
    patch.currency = { ...DEFAULT_SETTINGS.currency, target: legacy.primaryCurrency.toUpperCase() }
  }
  if (typeof legacy.pop_win === 'boolean') {
    patch.translate = {
      ...(patch.translate ?? DEFAULT_SETTINGS.translate),
      openInWindow: legacy.pop_win,
    }
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
    // Append array defaults introduced after the user's stored schema (deepMerge
    // replaced these arrays wholesale). Order matters: use the schema stored on
    // disk, before we bump it below.
    const storedSchema = merged.schema
    merged.search.engines = appendNewBySince(
      merged.search.engines,
      DEFAULT_SETTINGS.search.engines,
      (e) => e.id,
      ENGINE_SINCE,
      storedSchema,
    )
    merged.aiActions = appendNewBySince(
      merged.aiActions,
      DEFAULT_SETTINGS.aiActions,
      (a) => a.target,
      AI_ACTION_SINCE,
      storedSchema,
    )
    merged.schema = SCHEMA_VERSION
    await chrome.storage.sync.set({ [KEY]: merged })
  }
  return merged
}

// Serialize writes within this context. setSettings does read-modify-write on
// the single settings blob; two calls firing together (e.g. rapid option
// toggles) would both read the same `current` and the second would clobber the
// first. Chaining makes each call re-read fresh after the previous write lands.
// ponytail: per-context lock only — two DIFFERENT contexts (options page +
// content script) writing in the same tick can still lose an update, since
// chrome.storage has no cross-context transaction. Move to per-field writes if
// that ever bites in practice.
let writeChain: Promise<unknown> = Promise.resolve()

export function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = writeChain
    .catch(() => {})
    .then(async () => {
      const current = await getSettings()
      const merged = deepMerge(current, patch)
      await chrome.storage.sync.set({ [KEY]: merged })
      return merged
    })
  writeChain = next
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
