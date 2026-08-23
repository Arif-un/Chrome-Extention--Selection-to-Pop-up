export interface SearchEngine {
  id: string
  name: string
  /** URL template; `%s` is replaced with the (encoded) selection. */
  url: string
  enabled: boolean
}

export type CustomActionType = 'url' | 'js'

export interface CustomAction {
  id: string
  name: string
  type: CustomActionType
  /** For `url`: a template with `%s`. For `js`: a function body (see sandbox runner). */
  template: string
  enabled: boolean
}

import type { Appearance } from './appearance'

export interface Settings {
  /** schema version, bumped on migrations */
  schema: number
  builtins: {
    search: boolean
    copy: boolean
    translate: boolean
    dictionary: boolean
    currency: boolean
  }
  search: {
    engines: SearchEngine[]
    defaultEngineId: string
  }
  translate: {
    targetLang: string
    /** open Google Translate in a separate window instead of inline popup */
    openInWindow: boolean
  }
  dictionary: {
    lang: string
  }
  currency: {
    base: string
    target: string
  }
  customActions: CustomAction[]
  trigger: {
    /** show the tooltip automatically on mouseup after a selection */
    onSelection: boolean
  }
  appearance: Appearance
}
