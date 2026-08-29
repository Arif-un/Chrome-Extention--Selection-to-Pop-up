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

export type BuiltinKey = 'search' | 'copy' | 'translate' | 'dictionary' | 'currency'

import type { Appearance } from './appearance'
import type { SelectionHandles } from './handles'

export interface Settings {
  /** schema version, bumped on migrations */
  schema: number
  builtins: Record<BuiltinKey, boolean>
  /**
   * Unified popup order: built-in keys and `custom:<id>` tokens plus exactly one
   * `__more__` divider. Tokens before the divider show in the icon bar; tokens
   * after it show behind the `⋯` overflow menu.
   */
  actionOrder: string[]
  /** master toggle for the `⋯` overflow menu; off = everything shows in the bar */
  moreMenu: boolean
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
  selectionHandles: SelectionHandles
}
