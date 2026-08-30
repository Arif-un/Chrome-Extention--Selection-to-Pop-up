import { cn } from '../lib/cn'

// Renders sanitized inline SVG markup for custom-action icons. Module-level and
// shared so its identity is stable across renders (an inline component redefined
// in a render loop remounts and re-parses the SVG on every emit, including per
// frame during a drag). Markup MUST already be sanitized on save (sanitizeSvg).
export function SvgIcon({
  markup,
  class: cls,
  size,
}: {
  markup: string
  class?: string
  /** fixed pixel size; overrides the default rem-based sizing (used by the tooltip bar) */
  size?: number
}) {
  return (
    <span
      class={cn('flex [&>svg]:h-full [&>svg]:w-full', size == null && 'h-4 w-4', cls)}
      style={size == null ? undefined : { width: `${size}px`, height: `${size}px` }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
