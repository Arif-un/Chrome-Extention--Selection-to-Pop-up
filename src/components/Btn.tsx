import type { ComponentChildren } from 'preact'

export function Btn({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: ComponentChildren
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      class="stp-btn flex h-8 w-8 cursor-pointer items-center justify-center"
    >
      {children}
    </button>
  )
}
