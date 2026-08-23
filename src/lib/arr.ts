/** Return a copy of `arr` with the item at index `i` shallow-merged with `patch`. */
export function updateAt<T>(arr: T[], i: number, patch: Partial<T>): T[] {
  return arr.map((x, j) => (j === i ? { ...x, ...patch } : x))
}
