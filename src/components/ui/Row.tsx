import type { ComponentChildren } from 'preact'

/**
 * A settings row: label on the left, control on the right. Renders a native
 * <label> so clicking the label text focuses/opens the nested control.
 */
export function Row({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <label class="flex items-center justify-between gap-3 text-sm">
      <span class="min-w-0 text-ink">{label}</span>
      {children}
    </label>
  )
}
