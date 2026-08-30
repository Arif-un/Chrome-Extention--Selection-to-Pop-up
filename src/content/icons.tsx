import type { JSX } from 'preact'

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round' as const,
  'stroke-linejoin': 'round' as const,
}

type P = JSX.SVGAttributes<SVGSVGElement>

export const IconSearch = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)
export const IconCopy = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)
export const IconTranslate = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 8 6 6" />
    <path d="m4 14 6-6 2-3" />
    <path d="M2 5h12" />
    <path d="M7 2h1" />
    <path d="m22 22-5-10-5 10" />
    <path d="M14 18h6" />
  </svg>
)
export const IconBook = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)
export const IconCurrency = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M14.8 9a2.5 2.5 0 0 0-2.3-1.5h-.5a2.5 2.5 0 0 0 0 5h.5a2.5 2.5 0 0 1 0 5h-.5A2.5 2.5 0 0 1 9.2 15" />
    <path d="M12 6v1.5M12 16.5V18" />
  </svg>
)
export const IconBolt = (p: P) => (
  <svg {...base} {...p}>
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)
export const IconGrip = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 9h16M4 15h16" />
  </svg>
)
export const IconClose = (p: P) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
export const IconMore = (p: P) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}>
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
)
export const IconGear = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
export const IconSun = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
export const IconMoon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
  </svg>
)

// AI targets: real brand logos from react-icons. Monochrome (currentColor) so
// they inherit --stp-fg, sized 16px to match the built-in icons above (react-icons
// default to 1em, which renders smaller than the fixed-16 local icons).
import { BsClaude } from 'react-icons/bs'
import { PiOpenAiLogo } from 'react-icons/pi'
import { RiGrokAiFill, RiGeminiLine } from 'react-icons/ri'

const ai = (Brand: (p: P) => JSX.Element) => (p: P) => <Brand width={16} height={16} {...p} />

export const IconClaude = ai(BsClaude as unknown as (p: P) => JSX.Element)
export const IconChatGPT = ai(PiOpenAiLogo as unknown as (p: P) => JSX.Element)
export const IconGrok = ai(RiGrokAiFill as unknown as (p: P) => JSX.Element)
export const IconGemini = ai(RiGeminiLine as unknown as (p: P) => JSX.Element)
