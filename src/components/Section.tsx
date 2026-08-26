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
    <section class="rounded-lg border border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-800/40">
      <h2 class="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      {desc && <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{desc}</p>}
      <div class="mt-3 space-y-3">{children}</div>
    </section>
  )
}
