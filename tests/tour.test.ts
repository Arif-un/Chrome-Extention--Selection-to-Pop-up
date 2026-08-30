import { describe, it, expect, beforeEach } from 'vitest'
import {
  TOUR_STEPS,
  TOUR_SEEN_KEY,
  tourSeen,
  markTourSeen,
  clampStep,
} from '../src/lib/tour'

describe('TOUR_STEPS', () => {
  it('has steps, each with a target selector and copy', () => {
    expect(TOUR_STEPS.length).toBeGreaterThan(0)
    for (const s of TOUR_STEPS) {
      expect(s.target.trim().length).toBeGreaterThan(0)
      expect(s.title.trim().length).toBeGreaterThan(0)
      expect(s.body.trim().length).toBeGreaterThan(0)
    }
  })

  it('ends on the Save button so users know changes need saving', () => {
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].target).toBe('[data-tour="save"]')
  })
})

describe('clampStep', () => {
  it('keeps the index inside [0, len)', () => {
    expect(clampStep(-1, 5)).toBe(0)
    expect(clampStep(2, 5)).toBe(2)
    expect(clampStep(9, 5)).toBe(4)
  })
})

describe('tour seen flag', () => {
  let store: Record<string, unknown>
  beforeEach(() => {
    store = {}
    ;(globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: store[key] }),
          set: async (obj: Record<string, unknown>) => {
            Object.assign(store, obj)
          },
        },
      },
    }
  })

  it('is false until marked, true after', async () => {
    expect(await tourSeen()).toBe(false)
    await markTourSeen()
    expect(store[TOUR_SEEN_KEY]).toBe(true)
    expect(await tourSeen()).toBe(true)
  })
})
