import { pickEndpoints, type SelGeom, type EndRect } from '../lib/handles'

/** Which endpoint the user grabbed. The opposite one stays pinned. */
export type DragSide = 'start' | 'end'

type PagePoint = { node: Node; offset: number }
export type DragCtx =
  | { mode: 'page'; drag: DragSide; fixed: PagePoint }
  | { mode: 'field'; drag: DragSide; el: HTMLInputElement | HTMLTextAreaElement; fixed: number }

export function isTextField(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!(el instanceof HTMLElement)) return false
  if (el instanceof HTMLTextAreaElement) return true
  // Only text-like inputs expose selectionStart/End; number/date/etc. throw.
  // 'password' is deliberately excluded so plaintext passwords never leave the field.
  return el instanceof HTMLInputElement && /^(text|search|url|tel|email|)$/.test(el.type)
}

/** The active input/textarea IFF it currently has a non-empty selection. */
function activeField(): HTMLInputElement | HTMLTextAreaElement | null {
  const el = document.activeElement
  if (!isTextField(el)) return null
  const { selectionStart, selectionEnd } = el
  if (selectionStart == null || selectionEnd == null || selectionStart === selectionEnd) return null
  return el
}

export function getSelectionText(): string {
  const field = activeField()
  if (field) return field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0).trim()
  return window.getSelection()?.toString().trim() ?? ''
}

// --- page selection geometry ---

function pageRects(): SelGeom | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const rects = Array.from(sel.getRangeAt(0).getClientRects()) as DOMRect[]
  return pickEndpoints(rects)
}

function caretPoint(x: number, y: number): PagePoint | null {
  const d = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }
  if (d.caretRangeFromPoint) {
    const r = d.caretRangeFromPoint(x, y)
    return r ? { node: r.startContainer, offset: r.startOffset } : null
  }
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y)
    return p ? { node: p.offsetNode, offset: p.offset } : null
  }
  return null
}

// --- input/textarea geometry (mirror-div measurement) ---
// ponytail: mirror-div is the standard textarea-caret hack; it can drift under
// exotic fonts, letter-spacing, or CSS transforms on the field. Upgrade path:
// swap for the Range-based getClientRects if browsers ever expose per-char rects
// inside form controls.

const MIRROR_PROPS = [
  'boxSizing', 'width', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth',
  'borderLeftWidth', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontFamily',
  'lineHeight', 'letterSpacing', 'wordSpacing', 'textAlign', 'textTransform', 'textIndent',
] as const

function buildMirror(el: HTMLInputElement | HTMLTextAreaElement): HTMLDivElement {
  const div = document.createElement('div')
  const cs = getComputedStyle(el)
  for (const p of MIRROR_PROPS) div.style[p] = cs[p]
  div.style.position = 'absolute'
  div.style.top = '0'
  div.style.left = '-9999px'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = el instanceof HTMLTextAreaElement ? 'pre-wrap' : 'pre'
  div.style.wordWrap = el instanceof HTMLTextAreaElement ? 'break-word' : 'normal'
  div.style.overflow = 'hidden'
  document.body.appendChild(div)
  return div
}

function coordIn(
  div: HTMLDivElement,
  el: HTMLInputElement | HTMLTextAreaElement,
  index: number,
): EndRect {
  const val = el.value
  div.textContent = val.slice(0, index)
  const marker = document.createElement('span')
  marker.textContent = val.slice(index) || '.'
  div.appendChild(marker)
  const elRect = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  // computed line-height is the string 'normal' by default (parseFloat -> NaN);
  // derive from font-size before falling back to the full control height.
  const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2 || elRect.height
  return {
    x: elRect.left + marker.offsetLeft - el.scrollLeft,
    top: elRect.top + marker.offsetTop - el.scrollTop,
    height: lineHeight,
  }
}

function fieldRects(el: HTMLInputElement | HTMLTextAreaElement): SelGeom | null {
  const s = el.selectionStart
  const e = el.selectionEnd
  if (s == null || e == null || s === e) return null
  const div = buildMirror(el)
  try {
    return { start: coordIn(div, el, s), end: coordIn(div, el, e) }
  } finally {
    div.remove()
  }
}

function fieldIndexFromPoint(
  el: HTMLInputElement | HTMLTextAreaElement,
  clientX: number,
  clientY: number,
): number {
  const div = buildMirror(el)
  try {
    // Reading-order position is monotonic in (top, x), so binary-search it.
    let lo = 0
    let hi = el.value.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      const c = coordIn(div, el, mid)
      const before =
        c.top + c.height <= clientY ? true : c.top > clientY ? false : c.x < clientX
      if (before) lo = mid + 1
      else hi = mid
    }
    return lo
  } finally {
    div.remove()
  }
}

// --- public API ---

export function getEndpointRects(): SelGeom | null {
  const field = activeField()
  return field ? fieldRects(field) : pageRects()
}

/** Capture the pinned endpoint so drags can pivot around it. */
export function beginDrag(drag: DragSide): DragCtx | null {
  const field = activeField()
  if (field) {
    const s = field.selectionStart ?? 0
    const e = field.selectionEnd ?? 0
    return { mode: 'field', drag, el: field, fixed: drag === 'start' ? e : s }
  }
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const r = sel.getRangeAt(0)
  const fixed =
    drag === 'start'
      ? { node: r.endContainer, offset: r.endOffset }
      : { node: r.startContainer, offset: r.startOffset }
  return { mode: 'page', drag, fixed }
}

/** Move the dragged endpoint to the pointer, keeping the pinned end fixed. */
export function applyDrag(ctx: DragCtx, clientX: number, clientY: number): void {
  if (ctx.mode === 'field') {
    const idx = fieldIndexFromPoint(ctx.el, clientX, clientY)
    ctx.el.setSelectionRange(Math.min(ctx.fixed, idx), Math.max(ctx.fixed, idx))
    return
  }
  const p = caretPoint(clientX, clientY)
  // Over inter-line gaps / margins, caretRangeFromPoint returns a block element
  // node whose offset can span many children — extending to it flickers a
  // whole-block selection. Only follow real text nodes.
  if (!p || p.node.nodeType !== Node.TEXT_NODE) return
  const sel = window.getSelection()
  // setBaseAndExtent tolerates base being after extent, so the pinned end holds
  // even when the user drags past it.
  sel?.setBaseAndExtent(ctx.fixed.node, ctx.fixed.offset, p.node, p.offset)
}
