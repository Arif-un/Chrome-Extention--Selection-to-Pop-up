import type { ComponentChildren } from 'preact'

export function Section({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children: ComponentChildren
}) {
  return (
    <section class="rounded-lg border border-slate-800 bg-slate-800/40 p-4">
      <h2 class="text-sm font-semibold text-white">{title}</h2>
      {desc && <p class="mt-0.5 text-xs text-slate-400">{desc}</p>}
      <div class="mt-3 space-y-3">{children}</div>
    </section>
  )
}
