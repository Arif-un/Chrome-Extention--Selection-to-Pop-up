import type { JSX } from 'preact'

export type Anchor = 'auto' | 'above' | 'below'
export type PresetName = 'dark' | 'light' | 'glass' | 'custom'
export type CornerShape = 'round' | 'squircle'

export interface Appearance {
  preset: PresetName
  fg: string // icon / text color (hex)
  accent: string // hover / accent color (hex)
  bg: string // background color (hex)
  bgOpacity: number // 0..1
  blur: number // px (0 = off)
  radius: number // px
  cornerShape: CornerShape // round arc vs squircle (superellipse) corners
  scale: number // 0.8..1.6 multiplier
  maxWidth: number // px, panel max width (actions wrap beyond it)
  border: boolean
  borderColor: string // hex
  shadow: boolean
  anchor: Anchor
  offsetX: number // px
  offsetY: number // px
}

/** Style-only fields (everything a preset controls except position). */
type StyleFields = Omit<Appearance, 'preset' | 'anchor' | 'offsetX' | 'offsetY'>

export const PRESETS: Record<Exclude<PresetName, 'custom'>, StyleFields> = {
  dark: {
    fg: '#e2e8f0',
    accent: '#2e74ff',
    bg: '#1e293b',
    bgOpacity: 0.78,
    blur: 8,
    radius: 20,
    cornerShape: 'round',
    scale: 1,
    maxWidth: 384,
    border: true,
    borderColor: '#334155',
    shadow: true,
  },
  light: {
    fg: '#030407',
    accent: '#2e58ff',
    bg: '#ffffff',
    bgOpacity: 0.35,
    blur: 7,
    radius: 23,
    cornerShape: 'round',
    scale: 0.85,
    maxWidth: 384,
    border: true,
    borderColor: '#bababa',
    shadow: true,
  },
  glass: {
    fg: '#0f172a',
    accent: '#0ea5e9',
    bg: '#ffffff',
    bgOpacity: 0.35,
    blur: 16,
    radius: 14,
    cornerShape: 'squircle',
    scale: 1,
    maxWidth: 384,
    border: true,
    borderColor: '#ffffff',
    shadow: true,
  },
}

export const DEFAULT_APPEARANCE: Appearance = {
  preset: 'dark',
  ...PRESETS.dark,
  anchor: 'auto',
  offsetX: 0,
  offsetY: 0,
}

export function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '')
  const n =
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return hex
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** CSS custom properties + panel style derived from an appearance config. */
export function appearanceStyle(a: Appearance): JSX.CSSProperties {
  const blur = a.blur > 0 ? `blur(${a.blur}px)` : 'none'
  return {
    '--stp-fg': a.fg,
    '--stp-accent': a.accent,
    '--stp-accent-fg': '#ffffff',
    '--stp-bg': hexToRgba(a.bg, a.bgOpacity),
    '--stp-radius': `${a.radius}px`,
    '--stp-corner-shape': a.cornerShape,
    // Buttons nest inside the panel: inner radius = panel radius minus the 4px
    // panel padding, so corners stay concentric at any roundness.
    '--stp-radius-inner': `${Math.max(0, a.radius - 4)}px`,
    '--stp-border': a.border ? `1px solid ${a.borderColor}` : 'none',
    '--stp-shadow': a.shadow ? '0 10px 30px rgba(0, 0, 0, 0.35)' : 'none',
    maxWidth: `${a.maxWidth}px`,
    // Set backdrop-filter inline: the CSS transformer (lightningcss) drops the
    // unprefixed property from the stylesheet. Inline styles bypass it, so both
    // the standard and -webkit- forms reach the DOM.
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    zoom: String(a.scale),
  }
}
