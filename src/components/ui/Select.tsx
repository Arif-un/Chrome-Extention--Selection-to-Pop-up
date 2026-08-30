import type { JSX } from 'preact'
import { cn } from '../../lib/cn'
import { field } from './field'

export function Select(props: JSX.IntrinsicElements['select']) {
  const { class: cls, children, ...rest } = props
  return (
    <div class="relative inline-flex">
      <select {...rest} class={cn(field, 'cursor-pointer appearance-none pr-7', cls)}>
        {children}
      </select>
      <svg
        class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  )
}
