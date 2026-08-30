/** Return a copy of `arr` with the item at index `i` shallow-merged with `patch`. */
export function updateAt<T>(arr: T[], i: number, patch: Partial<T>): T[] {
  return arr.map((x, j) => (j === i ? { ...x, ...patch } : x))
}

/** Return a copy of `arr` with the item at `from` moved to index `to`. */
export function move<T>(arr: T[], from: number, to: number): T[] {
  const out = arr.slice()
  const [x] = out.splice(from, 1)
  out.splice(to, 0, x)
  return out
}

/**
 * Move item at `from` so it lands immediately *before* original index `to`
 * (drop-before semantics for a top-border drop indicator). Because move()
 * inserts after removal, a downward drag would otherwise overshoot by one.
 */
export function moveBefore<T>(arr: T[], from: number, to: number): T[] {
  return move(arr, from, from < to ? to - 1 : to)
}
