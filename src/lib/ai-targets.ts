/** AI assistant targets: prompt rendering, URL building, and DOM-injection specs. */

export type AiTarget = 'chatgpt' | 'claude' | 'gemini' | 'grok'

export interface AiTargetDef {
  key: AiTarget
  label: string
  /** Hostnames this target serves from (DNR sub-frame rules + injector matching). */
  domains: string[]
  /** Build a URL that prefills — and where supported, auto-submits — the prompt. */
  buildUrl: (prompt: string) => string
  /** true when buildUrl auto-submits via a query param (no DOM injection needed). */
  urlSubmits: boolean
  /**
   * Selectors for the composer input, used by the DOM-injection fallback when
   * urlSubmits is false. Tried in order; first match wins. Keep the broadest
   * selector LAST as a safety net so a redesign that only breaks the specific
   * ones still lands somewhere.
   * ponytail: this rots whenever the AI redesigns its composer — one place to fix.
   */
  inject: { input: string[] }
}

/** Hash key carrying the prompt to the in-page injector when no query param exists. */
export const AI_HASH_KEY = '__stp_ai'

export const AI_TARGETS: AiTargetDef[] = [
  {
    key: 'chatgpt',
    label: 'ChatGPT',
    domains: ['chatgpt.com', 'chat.openai.com'],
    buildUrl: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`,
    urlSubmits: true,
    inject: { input: ['#prompt-textarea', 'textarea'] },
  },
  {
    key: 'claude',
    label: 'Claude',
    domains: ['claude.ai'],
    // ponytail: claude.ai/new?q= prefills+sends today; if that breaks, flip urlSubmits
    // to false and the injector selector below takes over.
    buildUrl: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`,
    urlSubmits: true,
    inject: {
      input: ['div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]'],
    },
  },
  {
    key: 'gemini',
    label: 'Gemini',
    domains: ['gemini.google.com'],
    // No prompt query param — always DOM-injected via the hash fallback.
    buildUrl: () => 'https://gemini.google.com/app',
    urlSubmits: false,
    inject: { input: ['div.ql-editor[contenteditable="true"]', 'div[contenteditable="true"]'] },
  },
  {
    key: 'grok',
    label: 'Grok',
    domains: ['grok.com'],
    buildUrl: (p) => `https://grok.com/?q=${encodeURIComponent(p)}`,
    urlSubmits: true,
    inject: { input: ['textarea[aria-label]', 'main textarea', 'textarea'] },
  },
]

export function aiTarget(key: AiTarget): AiTargetDef | undefined {
  return AI_TARGETS.find((t) => t.key === key)
}

/** Every AI hostname, for DNR sub-frame header rules + injector host matching. */
export const AI_DOMAINS: string[] = AI_TARGETS.flatMap((t) => t.domains)

/** Match-pattern origins for every AI host — manifest optional_host_permissions + permissions API. */
export const AI_ORIGINS: string[] = AI_DOMAINS.map((d) => `https://${d}/*`)

/** Match-pattern origins for one target's hosts (permissions request/contains). */
export function originsForTarget(target: AiTarget): string[] {
  const def = aiTarget(target)
  return def ? def.domains.map((d) => `https://${d}/*`) : []
}

/** Substitute the selection into a template. `{selection}`, `{text}`, `%s` all work. */
export function renderPrompt(template: string, selection: string): string {
  if (!template) return selection
  return template.replace(/\{selection\}|\{text\}|%s/g, () => selection)
}

/**
 * URL to open for a surface. Query-param targets auto-submit; others carry the
 * prompt in the hash so the in-page injector can type + send it.
 */
export function surfaceUrl(def: AiTargetDef, prompt: string): string {
  if (def.urlSubmits) return def.buildUrl(prompt)
  return `${def.buildUrl(prompt)}#${AI_HASH_KEY}=${encodeURIComponent(prompt)}`
}

/**
 * Wrap an AI URL so it loads inside our extension frame page (`base` = the
 * getURL() of that page). The AI iframe is then initiated by the extension
 * origin, which is what the scoped DNR header-strip keys off — an arbitrary web
 * page framing the AI directly stays blocked. Round-trips through `?u=`.
 */
export function wrappedFrameUrl(base: string, aiUrl: string): string {
  return `${base}?u=${encodeURIComponent(aiUrl)}`
}

/** Read a hash-carried prompt from a location hash, or null. */
export function promptFromHash(hash: string): string | null {
  const m = hash.match(new RegExp(`${AI_HASH_KEY}=([^&]+)`))
  if (!m) return null
  // The hash is attacker-craftable; a malformed percent-escape (e.g. `%`) makes
  // decodeURIComponent throw. Swallow it so it can't halt content-script eval
  // (this runs before mount() — an uncaught throw would kill the whole overlay).
  try {
    return decodeURIComponent(m[1])
  } catch {
    return null
  }
}

/** The AI target serving the given hostname, or undefined. */
export function targetForHost(hostname: string): AiTargetDef | undefined {
  return AI_TARGETS.find((t) => t.domains.some((d) => hostname === d || hostname.endsWith('.' + d)))
}

/**
 * Guard for the web-accessible frame host: return `raw` only if it's an https
 * URL for a known AI host, else null. Any site can embed the wrapper page with
 * its own `?u=`, so this stops it being abused as a framing proxy.
 */
export function safeAiFrameUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return null
    return targetForHost(u.hostname) ? raw : null
  } catch {
    return null
  }
}
