import type { JSX } from 'preact'
import { cn } from '../../lib/cn'
import { field } from './field'

export function Input(props: JSX.IntrinsicElements['input']) {
  const { class: cls, ...rest } = props
  return <input {...rest} class={cn(field, cls)} />
}
