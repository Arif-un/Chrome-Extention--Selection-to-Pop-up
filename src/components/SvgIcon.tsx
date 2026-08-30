import { cn } from '../lib/cn'

// Renders sanitized inline SVG markup for custom-action icons. Module-level and
// shared so its identity is stable across renders (an inline component redefined
// in a render loop remounts and re-parses the SVG on every emit, including per
// frame during a drag). Markup MUST already be sanitized on save (sanitizeSvg).
export function SvgIcon({ markup, class: cls }: { markup: string; class?: string }) {
  return (
    <span
      class={cn('flex h-4 w-4 [&>svg]:h-full [&>svg]:w-full', cls)}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
