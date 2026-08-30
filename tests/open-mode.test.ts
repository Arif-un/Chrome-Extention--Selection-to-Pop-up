import { describe, it, expect } from 'vitest'
import { popupSize, popupFeatures, OPEN_MODE_LABELS } from '../src/lib/open-mode'

describe('popupSize', () => {
  it('sizes the window modes and returns null for tab/sidebar', () => {
    expect(popupSize('miniWindow')).toEqual({ w: 480, h: 640 })
    expect(popupSize('window')).toEqual({ w: 1024, h: 768 })
    expect(popupSize('tab')).toBeNull()
    expect(popupSize('sidebar')).toBeNull()
  })
})

describe('popupFeatures', () => {
  it('centers the popup on the screen', () => {
    expect(popupFeatures(480, 640, 1920, 1080)).toBe(
      'popup,noopener,noreferrer,width=480,height=640,left=720,top=220',
    )
  })
  it('never produces negative offsets on small screens', () => {
    expect(popupFeatures(1024, 768, 800, 600)).toBe(
      'popup,noopener,noreferrer,width=1024,height=768,left=0,top=0',
    )
  })
})

describe('OPEN_MODE_LABELS', () => {
  it('labels every mode', () => {
    expect(Object.keys(OPEN_MODE_LABELS).sort()).toEqual(
      ['miniWindow', 'sidebar', 'tab', 'window'].sort(),
    )
  })
})
