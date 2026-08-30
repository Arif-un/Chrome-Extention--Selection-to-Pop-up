import DOMPurify from 'dompurify'
import { fetchSvg } from '../services/icon'

// ponytail: 4KB/icon cap on the shared ~8KB sync 'settings' item; move customAction
// icons to chrome.storage.local keyed by id if users need many/large icons.
const MAX_ICON_BYTES = 4096

/**
 * Sanitize SVG markup for safe inline rendering: strips <script>, on* handlers,
 * <foreignObject>, external refs, etc. Throws if the input isn't/doesn't survive as SVG.
 */
export function sanitizeSvg(markup: string): string {
  const clean = DOMPurify.sanitize(markup, {
    USE_PROFILES: { svg: true, svgFilters: true },
  })
  if (!clean.includes('<svg')) throw new Error('Not a valid SVG.')
  if (new Blob([clean]).size > MAX_ICON_BYTES) {
    throw new Error(`Icon too large (max ${MAX_ICON_BYTES / 1024}KB after cleanup).`)
  }
  return clean
}

function decodeDataUrl(input: string): string {
  const m = input.match(/^data:image\/svg\+xml([^,]*),(.*)$/s)
  if (!m) throw new Error('Unsupported data URL.')
  const [, meta, data] = m
  if (!meta.includes('base64')) return decodeURIComponent(data)
  // atob gives a latin1 binary string; decode as UTF-8 so multibyte glyphs survive.
  return new TextDecoder().decode(Uint8Array.from(atob(data), (c) => c.charCodeAt(0)))
}

/**
 * Resolve an icon source to sanitized inline SVG markup. Accepts raw `<svg>` markup,
 * a `data:image/svg+xml` URL, or an http(s) URL (fetched, CORS-limited).
 */
export async function resolveIcon(input: string): Promise<string> {
  const src = input.trim()
  if (!src) throw new Error('Paste an SVG URL or markup.')

  if (src.startsWith('<svg') || src.startsWith('<?xml')) return sanitizeSvg(src)
  if (src.startsWith('data:image/svg+xml')) return sanitizeSvg(decodeDataUrl(src))

  return sanitizeSvg(await fetchSvg(src))
}
