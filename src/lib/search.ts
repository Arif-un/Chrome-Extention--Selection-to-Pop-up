import type { SearchEngine } from './types'

/**
 * Resolve which engine a search runs with: an explicitly requested engine wins,
 * otherwise the configured default, otherwise the first enabled one, otherwise
 * the first in the list. `undefined` only when there are no engines at all.
 */
export function pickSearchEngine(
  engines: SearchEngine[],
  defaultId: string,
  requestedId?: string,
): SearchEngine | undefined {
  if (requestedId) {
    const req = engines.find((e) => e.id === requestedId)
    if (req) return req
  }
  return engines.find((e) => e.id === defaultId) ?? engines.find((e) => e.enabled) ?? engines[0]
}
