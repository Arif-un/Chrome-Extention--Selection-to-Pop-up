// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { isTextField, getSelectionText } from '../src/content/selection'

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

function input(type: string): HTMLInputElement {
  const el = document.createElement('input')
  el.type = type
  document.body.appendChild(el)
  return el
}

describe('isTextField', () => {
  it('accepts textareas', () => {
    const ta = document.createElement('textarea')
    expect(isTextField(ta)).toBe(true)
  })

  it('accepts text-like input types', () => {
    for (const t of ['text', 'search', 'url', 'tel', 'email']) {
      expect(isTextField(input(t))).toBe(true)
    }
  })

  it('accepts an input with no explicit type (defaults to text)', () => {
    const el = document.createElement('input')
    document.body.appendChild(el)
    expect(isTextField(el)).toBe(true)
  })

  it('excludes password fields so plaintext passwords never leave the field', () => {
    expect(isTextField(input('password'))).toBe(false)
  })

  it('rejects non-text input types that throw on selectionStart', () => {
    for (const t of ['number', 'date', 'checkbox', 'range', 'color']) {
      expect(isTextField(input(t))).toBe(false)
    }
  })

  it('rejects null and non-input elements', () => {
    expect(isTextField(null)).toBe(false)
    expect(isTextField(document.createElement('div'))).toBe(false)
  })
})

describe('getSelectionText', () => {
  it('returns the trimmed selection inside an active text field', () => {
    const el = input('text')
    el.value = 'hello world'
    el.focus()
    el.setSelectionRange(0, 6) // 'hello ' -> trimmed 'hello'
    expect(document.activeElement).toBe(el)
    expect(getSelectionText()).toBe('hello')
  })

  it('ignores a collapsed (empty) field selection and falls back to the page', () => {
    const el = input('text')
    el.value = 'hello'
    el.focus()
    el.setSelectionRange(2, 2) // collapsed -> activeField() returns null
    vi.stubGlobal('getSelection', () => ({ toString: () => '  page pick  ' }))
    expect(getSelectionText()).toBe('page pick')
  })

  it('returns the trimmed page selection when no text field is focused', () => {
    vi.stubGlobal('getSelection', () => ({ toString: () => '  from page  ' }))
    expect(getSelectionText()).toBe('from page')
  })

  it('returns empty string when nothing is selected', () => {
    vi.stubGlobal('getSelection', () => null)
    expect(getSelectionText()).toBe('')
  })
})
