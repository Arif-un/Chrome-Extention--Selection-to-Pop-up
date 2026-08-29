import { BUILTIN_KEYS } from './builtins'
import type { CustomAction } from './types'

/** Divider token in `actionOrder`: everything after it lives in the `⋯` menu. */
export const MORE = '__more__'

/**
 * Reconcile the stored token order against the current built-ins/custom set:
 * drop stale tokens, guarantee exactly one MORE divider, and append any
 * missing action (new built-in or newly-added custom) just before the divider.
 */
export function actionTokens(order: string[] | undefined, customActions: CustomAction[]): string[] {
  const customTokens = customActions.map((a) => `custom:${a.id}`)
  const valid = new Set<string>([...BUILTIN_KEYS, ...customTokens, MORE])
  const seen = new Set<string>()
  // keep known tokens in stored order, deduped (also collapses repeat dividers)
  let out = (order ?? []).filter((t) => valid.has(t) && !seen.has(t) && (seen.add(t), true))
  if (!out.includes(MORE)) out.push(MORE)
  const present = new Set(out)
  const missing = [...BUILTIN_KEYS, ...customTokens].filter((t) => !present.has(t))
  const at = out.indexOf(MORE)
  out = [...out.slice(0, at), ...missing, ...out.slice(at)]
  return out
}
