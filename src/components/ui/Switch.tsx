import { cn } from '../../lib/cn'

/** macOS pill toggle. `label`, when given, renders after the switch. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  title,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  disabled?: boolean
  /** Accessible name / tooltip when there is no visible `label` (icon-only use). */
  title?: string
}) {
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? title}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      class={cn(
        'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors disabled:opacity-40',
        checked ? 'bg-accent' : 'bg-black/15 dark:bg-white/20',
      )}
    >
      <span
        class={cn(
          'absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform',
          checked && 'translate-x-4',
        )}
      />
    </button>
  )
  if (!label) return toggle
  return (
    <label class="flex cursor-pointer select-none items-center gap-2.5 text-sm">
      {toggle}
      <span>{label}</span>
    </label>
  )
}
