import type { ComponentChildren } from 'preact'
import { cn } from '../lib/cn'

/**
 * macOS System-Settings style group: a small header above an inset card.
 * `divided` turns direct children into hairline-separated rows (auto-padded);
 * otherwise the card is a single padded panel. `footnote` renders muted text
 * below the card.
 */
export function Section({
  title,
  desc,
  children,
  divided,
  footnote,
}: {
  title: string
  desc?: string
  children: ComponentChildren
  divided?: boolean
  footnote?: ComponentChildren
}) {
  return (
    <section class="space-y-2">
      <div class="px-1">
        <h2 class="text-[13px] font-semibold text-ink">{title}</h2>
        {desc && <p class="mt-0.5 text-xs leading-relaxed text-muted">{desc}</p>}
      </div>
      <div
        class={cn(
          'overflow-hidden rounded-xl border border-line bg-surface shadow-sm',
          divided ? 'divide-y divide-line [&>*]:px-4 [&>*]:py-3' : 'space-y-3 p-4',
        )}
      >
        {children}
      </div>
      {footnote && <p class="px-1 text-xs leading-relaxed text-muted">{footnote}</p>}
    </section>
  )
}
