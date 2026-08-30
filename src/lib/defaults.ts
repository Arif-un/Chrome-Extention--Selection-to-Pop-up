import type { Settings, SearchEngine, AiAction, AiWindow } from './types'
import { DEFAULT_APPEARANCE } from './appearance'
import { DEFAULT_HANDLES } from './handles'
import { MORE } from './actions'
import { AI_TARGETS } from './ai-targets'

export const DEFAULT_AI_WINDOW: AiWindow = {
  w: 460,
  h: 640,
  x: null,
  y: null,
  bg: '#0b1220',
  bgOpacity: 1,
  radius: 12,
  border: true,
  borderColor: '#334155',
  shadow: true,
}

// ChatGPT is enabled out of the box; the rest ship disabled so the tooltip
// stays uncluttered until the user turns them on in options.
export const DEFAULT_AI_ACTIONS: AiAction[] = AI_TARGETS.map((t) => ({
  target: t.key,
  label: t.label,
  enabled: t.key === 'chatgpt',
  template: '{selection}',
  mode: 'tab',
  window: { ...DEFAULT_AI_WINDOW },
}))

export const DEFAULT_ENGINES: SearchEngine[] = [
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s', enabled: true },
  { id: 'ddg', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', enabled: true },
  { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s', enabled: false },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    url: 'https://en.wikipedia.org/w/index.php?search=%s',
    enabled: false,
  },
]

export const SCHEMA_VERSION = 7

export const DEFAULT_SETTINGS: Settings = {
  schema: SCHEMA_VERSION,
  builtins: { search: true, copy: true, translate: true, dictionary: true, currency: false },
  actionOrder: ['search', 'copy', 'translate', 'dictionary', 'currency', MORE],
  moreMenu: true,
  search: { engines: DEFAULT_ENGINES, defaultEngineId: 'google' },
  translate: { targetLang: 'bn', openInWindow: false },
  dictionary: { lang: 'en' },
  currency: { base: 'USD', target: 'INR' },
  customActions: [],
  aiActions: DEFAULT_AI_ACTIONS,
  trigger: { onSelection: true },
  appearance: DEFAULT_APPEARANCE,
  selectionHandles: DEFAULT_HANDLES,
}
