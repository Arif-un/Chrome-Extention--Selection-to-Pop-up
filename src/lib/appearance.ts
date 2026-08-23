import type { JSX } from 'preact'

export type Anchor = 'auto' | 'above' | 'below'
export type PresetName = 'dark' | 'light' | 'glass' | 'custom'

export interface Appearance {
  preset: PresetName
  fg: string // icon / text color (hex)
  accent: string // hover / accent color (hex)
  bg: string // background color (hex)
  bgOpacity: number // 0..1
  blur: number // px (0 = off)
  radius: number // px
  scale: number // 0.8..1.6 multiplier
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
    accent: '#0284c7',
    bg: '#1e293b',
    bgOpacity: 0.96,
    blur: 8,
    radius: 8,
    scale: 1,
    border: true,
    borderColor: '#334155',
    shadow: true,
  },
  light: {
    fg: '#0f172a',
    accent: '#0284c7',
    bg: '#ffffff',
    bgOpacity: 0.98,
    blur: 6,
    radius: 8,
    scale: 1,
    border: true,
    borderColor: '#e2e8f0',
    shadow: true,
  },
  glass: {
    fg: '#0f172a',
    accent: '#0ea5e9',
    bg: '#ffffff',
    bgOpacity: 0.35,
    blur: 16,
    radius: 14,
    scale: 1,
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

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '')
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
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
    // Buttons nest inside the panel: inner radius = panel radius minus the 4px
    // panel padding, so corners stay concentric at any roundness.
    '--stp-radius-inner': `${Math.max(0, a.radius - 4)}px`,
    '--stp-border': a.border ? `1px solid ${a.borderColor}` : 'none',
    '--stp-shadow': a.shadow ? '0 10px 30px rgba(0, 0, 0, 0.35)' : 'none',
    // Set backdrop-filter inline: the CSS transformer (lightningcss) drops the
    // unprefixed property from the stylesheet. Inline styles bypass it, so both
    // the standard and -webkit- forms reach the DOM.
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    zoom: String(a.scale),
  }
}
