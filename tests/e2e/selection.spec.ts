import { test, expect } from './fixture'
import type { Page } from '@playwright/test'

/** Grab a handle by its centre and drag it to (x, y) in viewport coords. */
async function drag(page: Page, side: 'start' | 'end', x: number, y: number) {
  const box = await page.locator(`[data-stp-handle="${side}"]`).boundingBox()
  if (!box) throw new Error(`no ${side} handle`)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(x, y, { steps: 8 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html')
  await page.waitForSelector('#__stp_host', { state: 'attached' })
})

test('drag end handle extends a page-text selection', async ({ page }) => {
  await page.dblclick('#w1') // selects "quick"
  await expect(page.locator('[data-stp-handle="end"]')).toBeVisible()
  expect((await page.evaluate(() => window.getSelection()?.toString() ?? '')).trim()).toBe('quick')

  const fox = await page.locator('#w3').boundingBox()
  if (!fox) throw new Error('no #w3')
  await drag(page, 'end', fox.x + fox.width + 2, fox.y + fox.height / 2) // just past "fox"

  const sel = (await page.evaluate(() => window.getSelection()?.toString() ?? '')).trim()
  expect(sel).toContain('quick')
  expect(sel).toContain('fox')
})

test('drag across wrapped lines stays bounded (no whole-doc selection)', async ({ page }) => {
  await page.dblclick('#m0') // "alpha" on the first wrapped line
  await expect(page.locator('[data-stp-handle="end"]')).toBeVisible()

  const epsilon = await page.locator('#m4').boundingBox() // a later wrapped line
  if (!epsilon) throw new Error('no #m4')
  await drag(page, 'end', epsilon.x + epsilon.width + 2, epsilon.y + epsilon.height / 2)

  const sel = (await page.evaluate(() => window.getSelection()?.toString() ?? '')).trim()
  expect(sel).toContain('alpha')
  expect(sel).toContain('epsilon')
  expect(sel).not.toContain('SENTINEL') // never bled into the rest of the document
})

test('multi-line drag never blinks (no empty / no whole-doc frame)', async ({ page }) => {
  await page.dblclick('#m0') // "alpha" on the first wrapped line
  await expect(page.locator('[data-stp-handle="end"]')).toBeVisible()

  // Record the selection on every change during the drag, not just at the end.
  // The reported bug was the selection flashing empty ("unselect") and/or
  // spanning the whole document mid-drag.
  await page.evaluate(() => {
    ;(window as unknown as { __sel: string[] }).__sel = []
    document.addEventListener('selectionchange', () =>
      (window as unknown as { __sel: string[] }).__sel.push(window.getSelection()?.toString() ?? ''),
    )
  })

  const start = await page.locator('[data-stp-handle="end"]').boundingBox()
  const zeta = await page.locator('#m5').boundingBox()
  if (!start || !zeta) throw new Error('missing geometry')

  // Drag down across the wrapped lines to the last word.
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(zeta.x + zeta.width + 2, zeta.y + zeta.height / 2, { steps: 20 })
  await page.mouse.up()

  const log = (await page.evaluate(() => (window as unknown as { __sel: string[] }).__sel)).map((s) =>
    s.trim(),
  )
  expect(log.length).toBeGreaterThan(0)
  // No "unselect" frame: the selection never collapses to empty while dragging.
  expect(log.every((s) => s.length > 0)).toBe(true)
  // No whole-doc frame: nothing outside the paragraph is ever selected.
  expect(log.some((s) => s.includes('SENTINEL'))).toBe(false)
  // Ends spanning the intended range.
  const final = log[log.length - 1]
  expect(final).toContain('alpha')
  expect(final).toContain('zeta')
})

test('drag end handle extends a textarea selection', async ({ page }) => {
  await page.evaluate(() => {
    const ta = document.getElementById('ta') as HTMLTextAreaElement
    ta.focus()
    ta.setSelectionRange(4, 9) // "quick"
    document.dispatchEvent(new Event('selectionchange'))
  })
  await expect(page.locator('[data-stp-handle="end"]')).toBeVisible()

  const box = await page.locator('[data-stp-handle="end"]').boundingBox()
  const ta = await page.locator('#ta').boundingBox()
  if (!box || !ta) throw new Error('no handle / textarea')
  await drag(page, 'end', box.x + 200, ta.y + 24) // rightward, first line

  const [start, end, selected] = await page.$eval('#ta', (el: HTMLTextAreaElement) => [
    el.selectionStart,
    el.selectionEnd,
    el.value.slice(el.selectionStart, el.selectionEnd),
  ])
  expect(start).toBe(4)
  expect(end).toBeGreaterThan(9)
  expect(selected.startsWith('quick')).toBe(true)
})
