/**
 * Fetch remote SVG icon markup. Lives in services/ so all external network I/O
 * stays out of lib/ (see CLAUDE.md: "External calls only in services/").
 * CORS-limited; returns raw markup for the caller to sanitize.
 */
export async function fetchSvg(url: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new Error("Couldn't fetch — the host may block CORS. Paste the SVG markup instead.")
  }
  if (!res.ok) throw new Error(`Fetch failed (HTTP ${res.status}). Paste the SVG markup instead.`)
  const text = await res.text()
  if (!text.includes('<svg')) throw new Error('That URL did not return an SVG.')
  return text
}
