import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  CHROME_STORE_URL,
  GITHUB_ISSUES_URL,
  FEEDBACK_MESSAGES,
  randomFeedbackMessage,
} from '../src/lib/feedback'

afterEach(() => vi.restoreAllMocks())

describe('feedback links', () => {
  it('point at the store support page and the github issues page', () => {
    expect(CHROME_STORE_URL).toMatch(/^https:\/\/chromewebstore\.google\.com\//)
    expect(GITHUB_ISSUES_URL).toMatch(/^https:\/\/github\.com\/.+\/issues$/)
  })
})

describe('randomFeedbackMessage', () => {
  it('has a non-empty message list', () => {
    expect(FEEDBACK_MESSAGES.length).toBeGreaterThan(0)
    expect(FEEDBACK_MESSAGES.every((m) => m.trim().length > 0)).toBe(true)
  })

  it('always returns a message from the list', () => {
    for (let i = 0; i < 20; i++) {
      expect(FEEDBACK_MESSAGES).toContain(randomFeedbackMessage())
    }
  })

  it('maps the random range to first and last entries', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(randomFeedbackMessage()).toBe(FEEDBACK_MESSAGES[0])
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    expect(randomFeedbackMessage()).toBe(FEEDBACK_MESSAGES[FEEDBACK_MESSAGES.length - 1])
  })
})
