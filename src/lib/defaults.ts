import type { Settings, SearchEngine } from './types'
import { DEFAULT_APPEARANCE } from './appearance'
import { DEFAULT_HANDLES } from './handles'
import { MORE } from './actions'

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

export const SCHEMA_VERSION = 6

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
  trigger: { onSelection: true },
  appearance: DEFAULT_APPEARANCE,
  selectionHandles: DEFAULT_HANDLES,
}
