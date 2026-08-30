// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mocked collaborators: keep the test on the store's own logic, not chrome/DOM I/O.
vi.mock('../src/lib/settings', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn().mockResolvedValue(undefined),
  onSettingsChange: vi.fn(),
}))
vi.mock('../src/content/run-js', () => ({ runJsAction: vi.fn() }))
vi.mock('../src/content/selection', () => ({ getEndpointRects: vi.fn(() => null) }))

import { store } from '../src/content/store'
import type { State } from '../src/content/store'
import { getEndpointRects } from '../src/content/selection'

const SETTINGS = {
  search: {
    engines: [{ id: 'g', name: 'Google', url: 'https://s/?q=%s', enabled: true }],
    defaultEngineId: 'g',
  },
  translate: { openInWindow: false, targetLang: 'es' },
  selectionHandles: { enabled: true },
  aiActions: [{ target: 'chatgpt', mode: 'iframe', template: '%s', window: { w: 400, h: 600 } }],
  customActions: [],
}

function reset() {
  store.state = {
    open: false,
    x: 0,
    y: 0,
    text: '',
    view: { kind: 'buttons' },
    settings: SETTINGS as unknown as State['settings'],
    copied: false,
    overrides: {},
    sel: null,
    dragging: false,
    preview: null,
  }
}

let requestPerm: ReturnType<typeof vi.fn>
let containsPerm: ReturnType<typeof vi.fn>

beforeEach(() => {
  reset()
  vi.stubGlobal('open', vi.fn())
  requestPerm = vi.fn().mockResolvedValue(true)
  // not yet granted by default, so performAi prompts (fresh-install flow)
  containsPerm = vi.fn().mockResolvedValue(false)
  vi.stubGlobal('chrome', {
    permissions: { request: requestPerm, contains: containsPerm },
    runtime: { sendMessage: vi.fn().mockResolvedValue(undefined) },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('selection lifecycle', () => {
  it('showButtons opens the popup with the given text/coords, ignoring empty text', () => {
    store.showButtons('', 5, 6)
    expect(store.state.open).toBe(false)
    store.showButtons('hi', 10, 20)
    expect(store.state).toMatchObject({ open: true, x: 10, y: 20, text: 'hi' })
    expect(store.state.view).toEqual({ kind: 'buttons' })
  })

  it('hide only emits when open', () => {
    const l = vi.fn()
    store.subscribe(l)
    store.hide() // already closed -> no-op
    expect(l).not.toHaveBeenCalled()
    store.showButtons('hi', 0, 0)
    l.mockClear()
    store.hide()
    expect(store.state.open).toBe(false)
    expect(l).toHaveBeenCalledTimes(1)
  })

  it('move updates coords and notifies subscribers', () => {
    const l = vi.fn()
    const unsub = store.subscribe(l)
    store.move(7, 8)
    expect(store.state).toMatchObject({ x: 7, y: 8 })
    expect(l).toHaveBeenCalledTimes(1)
    unsub()
    store.move(9, 9)
    expect(l).toHaveBeenCalledTimes(1) // unsubscribed
  })
})

describe('handle dragging', () => {
  it('setDragging only flips on change', () => {
    const l = vi.fn()
    store.subscribe(l)
    store.setDragging(false) // unchanged
    expect(l).not.toHaveBeenCalled()
    store.setDragging(true)
    expect(store.state.dragging).toBe(true)
    expect(l).toHaveBeenCalledTimes(1)
  })

  it('endDrag(fromMouse) arms consumeDragEnd exactly once', () => {
    store.setDragging(true)
    store.endDrag(true)
    expect(store.state.dragging).toBe(false)
    expect(store.consumeDragEnd()).toBe(true)
    expect(store.consumeDragEnd()).toBe(false)
  })

  it('endDrag(false) does not arm consumeDragEnd', () => {
    store.endDrag(false)
    expect(store.consumeDragEnd()).toBe(false)
  })

  it('syncHandles keeps last geometry mid-drag when the selection collapses', () => {
    const geom = { start: { x: 1, top: 2, height: 3 }, end: { x: 4, top: 5, height: 6 } }
    vi.mocked(getEndpointRects).mockReturnValueOnce(geom as never)
    store.syncHandles()
    expect(store.state.sel).toEqual(geom)
    // now selection collapses (returns null) while dragging -> geometry is retained
    store.setDragging(true)
    vi.mocked(getEndpointRects).mockReturnValueOnce(null)
    store.syncHandles()
    expect(store.state.sel).toEqual(geom)
  })

  it('syncHandles hides handles when disabled in settings', () => {
    store.state.settings = {
      ...SETTINGS,
      selectionHandles: { enabled: false },
    } as unknown as State['settings']
    store.syncHandles()
    expect(store.state.sel).toBeNull()
  })
})

describe('searchWith', () => {
  it('opens the default engine with the url-encoded selection', () => {
    store.showButtons('a b', 0, 0)
    expect(store.searchWith()).toBe(true)
    expect(window.open).toHaveBeenCalledWith('https://s/?q=a%20b', '_blank', 'noopener,noreferrer')
    expect(store.state.open).toBe(false)
  })

  it('returns false with no text', () => {
    expect(store.searchWith()).toBe(false)
    expect(window.open).not.toHaveBeenCalled()
  })

  it('falls back to the default engine when the requested id is unknown', () => {
    store.showButtons('x', 0, 0)
    expect(store.searchWith('nope')).toBe(true)
    expect(window.open).toHaveBeenCalledWith('https://s/?q=x', '_blank', 'noopener,noreferrer')
  })

  it('returns false when no engines are configured', () => {
    store.state.settings = {
      ...SETTINGS,
      search: { engines: [], defaultEngineId: 'g' },
    } as unknown as State['settings']
    store.showButtons('x', 0, 0)
    expect(store.searchWith()).toBe(false)
  })
})

describe('perform', () => {
  it('count renders a count result without any network request', async () => {
    await store.perform('count', 'one two')
    expect(store.state.view).toMatchObject({ kind: 'result', result: { kind: 'count' } })
  })

  it('copy uses navigator.clipboard and flips the copied tick', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await store.perform('copy', 'grab me')
    expect(writeText).toHaveBeenCalledWith('grab me')
    expect(store.state.copied).toBe(true)
  })

  it('copy falls back to execCommand when clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    const exec = vi.fn(() => true)
    document.execCommand = exec
    await store.perform('copy', 'grab me')
    expect(exec).toHaveBeenCalledWith('copy')
    expect(store.state.copied).toBe(true)
  })

  it('surfaces an error when copy fails on both paths', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    document.execCommand = vi.fn(() => false)
    await store.perform('copy', 'x')
    expect(store.state.view).toMatchObject({ kind: 'error' })
  })

  it('ignores empty selections', async () => {
    await store.perform('count', '   ')
    expect(store.state.view).toEqual({ kind: 'buttons' })
  })
})

describe('performAi', () => {
  it('iframe mode requests the host permission then opens the in-page preview', async () => {
    store.showButtons('hi', 0, 0)
    await store.performAi('chatgpt' as never)
    expect(requestPerm).toHaveBeenCalled()
    expect(store.state.preview).toMatchObject({ target: 'chatgpt' })
    expect(store.state.preview?.url).toContain('hi')
  })

  it('falls back to a plain tab when the framed host permission is denied', async () => {
    requestPerm.mockResolvedValue(false)
    store.showButtons('hi', 0, 0)
    await store.performAi('chatgpt' as never)
    expect(store.state.preview).toBeNull()
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('hi'),
      '_blank',
      'noopener,noreferrer',
    )
  })

  it('skips the permission prompt when the host is already granted', async () => {
    containsPerm.mockResolvedValue(true)
    store.showButtons('hi', 0, 0)
    await store.performAi('chatgpt' as never)
    expect(requestPerm).not.toHaveBeenCalled()
    expect(store.state.preview).toMatchObject({ target: 'chatgpt' })
  })

  it('closePreview clears an open preview', () => {
    store.state.preview = { target: 'chatgpt', url: 'u', win: {} } as unknown as State['preview']
    store.closePreview()
    expect(store.state.preview).toBeNull()
  })
})
