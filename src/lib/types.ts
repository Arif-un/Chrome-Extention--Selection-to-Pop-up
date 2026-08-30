export interface SearchEngine {
  id: string
  name: string
  /** URL template; `%s` is replaced with the (encoded) selection. */
  url: string
  enabled: boolean
}

export type CustomActionType = 'url' | 'js'

import type { OpenMode } from './open-mode'
export type { OpenMode }

export interface CustomAction {
  id: string
  name: string
  type: CustomActionType
  /** For `url`: a template with `%s`. For `js`: a function body (see sandbox runner). */
  template: string
  enabled: boolean
  /** Sanitized inline SVG markup for the action's icon; falls back to the bolt icon when absent. */
  icon?: string
  /** Where the resulting URL opens (URL actions, and JS actions that return a URL). Default: tab. */
  open?: OpenMode
}

export type BuiltinKey = 'search' | 'copy' | 'translate' | 'dictionary' | 'currency'

import type { Appearance } from './appearance'
import type { SelectionHandles } from './handles'
import type { AiTarget } from './ai-targets'

/** Where an AI action opens. tab/window/sidebar = logged-in; iframe = logged-out. */
export type AiMode = 'tab' | 'window' | 'sidebar' | 'iframe'

/** Appearance + geometry for the in-page iframe window (and window-mode size). */
export interface AiWindow {
  w: number
  h: number
  /** remembered top-left; null = centered on open */
  x: number | null
  y: number | null
  bg: string
  bgOpacity: number
  radius: number
  border: boolean
  borderColor: string
  shadow: boolean
}

export interface AiAction {
  /** doubles as the stable id; `ai:<target>` tokens key off this */
  target: AiTarget
  label: string
  enabled: boolean
  /** prompt template; `{selection}` / `{text}` / `%s` is replaced with the selection */
  template: string
  mode: AiMode
  window: AiWindow
}

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
  aiActions: AiAction[]
  trigger: {
    /** show the tooltip automatically on mouseup after a selection */
    onSelection: boolean
  }
  appearance: Appearance
  selectionHandles: SelectionHandles
}
