import type { Settings, SearchEngine, AiAction, AiWindow, AiMode } from './types'
import { PRESETS } from './appearance'
import { DEFAULT_HANDLES } from './handles'
import { MORE } from './actions'
import { AI_TARGETS, type AiTarget } from './ai-targets'

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

// Claude ships enabled (sidebar); the rest ship disabled so the tooltip stays
// uncluttered until the user turns them on in options.
const AI_ACTION_CONFIG: Record<AiTarget, { enabled: boolean; mode: AiMode }> = {
  chatgpt: { enabled: false, mode: 'window' },
  claude: { enabled: true, mode: 'sidebar' },
  gemini: { enabled: false, mode: 'iframe' },
  grok: { enabled: false, mode: 'tab' },
}

export const DEFAULT_AI_ACTIONS: AiAction[] = AI_TARGETS.map((t) => ({
  target: t.key,
  label: t.label,
  enabled: AI_ACTION_CONFIG[t.key].enabled,
  template: '{selection}',
  mode: AI_ACTION_CONFIG[t.key].mode,
  window: { ...DEFAULT_AI_WINDOW },
}))

export const DEFAULT_ENGINES: SearchEngine[] = [
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s', enabled: true },
  { id: 'ddg', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', enabled: false },
  { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s', enabled: false },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    url: 'https://en.wikipedia.org/w/index.php?search=%s',
    enabled: false,
  },
  {
    id: 'google-ai',
    name: 'Google AI',
    url: 'https://www.google.com/search?q=%s&udm=50',
    enabled: true,
  },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/?q=%s', enabled: false },
]

// Schema in which each default engine was first shipped. Migration only
// auto-adds an engine to existing installs whose stored schema predates it, so
// a default the user deliberately deleted is never resurrected. Omitted ids
// count as pre-existing (schema 0) and are never re-added.
export const ENGINE_SINCE: Record<string, number> = {
  'google-ai': 9,
  deepseek: 9,
}

// Schema in which each default AI action's target was first shipped. Same
// contract as ENGINE_SINCE: migration auto-adds a default AI action to existing
// installs whose stored schema predates it, never resurrecting one the user
// removed. All current targets predate this map, so they count as schema 0 (not
// re-added); add an entry when you ship a NEW default AI target in a later bump.
export const AI_ACTION_SINCE: Record<string, number> = {}

export const SCHEMA_VERSION = 9

export const DEFAULT_SETTINGS: Settings = {
  schema: SCHEMA_VERSION,
  builtins: {
    search: true,
    copy: true,
    translate: true,
    dictionary: true,
    currency: true,
    count: true,
  },
  actionOrder: [
    'copy',
    'translate',
    'search',
    'ai:claude',
    MORE,
    'ai:chatgpt',
    'ai:gemini',
    'ai:grok',
    'count',
    'currency',
    'dictionary',
  ],
  moreMenu: true,
  search: { engines: DEFAULT_ENGINES, defaultEngineId: 'google' },
  translate: { targetLang: 'bn', openInWindow: false },
  dictionary: { lang: 'en' },
  currency: { base: 'USD', target: 'BDT' },
  customActions: [],
  aiActions: DEFAULT_AI_ACTIONS,
  trigger: { onSelection: true },
  appearance: {
    preset: 'light',
    ...PRESETS.light,
    anchor: 'auto',
    offsetX: -35,
    offsetY: -70,
  },
  selectionHandles: DEFAULT_HANDLES,
}
