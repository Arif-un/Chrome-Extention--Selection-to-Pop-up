import type { ComponentChildren } from 'preact'

export function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: ComponentChildren
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
      class="stp-select cursor-pointer rounded border-none bg-transparent font-medium outline-none"
    >
      {children}
    </select>
  )
}
