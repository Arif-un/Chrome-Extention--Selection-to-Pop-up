import type { JSX } from 'preact'
import { cn } from '../../lib/cn'
import { field } from './field'

export function Textarea(props: JSX.IntrinsicElements['textarea']) {
  const { class: cls, ...rest } = props
  return <textarea {...rest} class={cn(field, cls)} />
}
