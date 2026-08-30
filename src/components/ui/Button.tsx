import type { JSX } from 'preact'
import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline'

const BTN: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40',
  ghost: 'text-ink/80 hover:bg-surface-hover',
  danger: 'text-danger hover:bg-danger/10',
  outline: 'border border-line bg-surface text-ink hover:bg-surface-hover',
}

export function Button({
  variant = 'ghost',
  class: cls,
  ...rest
}: JSX.IntrinsicElements['button'] & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...rest}
      class={cn(
        'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed',
        BTN[variant],
        cls,
      )}
    />
  )
}
