import { describe, expect, it } from 'vitest'
import {
  boxToUnderstandingLevel,
  formatRelativeDue,
  getLevelConfig,
} from './understanding'

describe('understanding library', () => {
  it('maps box to understanding level accurately', () => {
    expect(boxToUnderstandingLevel(0)).toBe('UNKNOWN')
    expect(boxToUnderstandingLevel(1)).toBe('UNKNOWN')
    expect(boxToUnderstandingLevel(2)).toBe('FAMILIAR')
    expect(boxToUnderstandingLevel(3)).toBe('LEARNING')
    expect(boxToUnderstandingLevel(4)).toBe('MASTERED')
    expect(boxToUnderstandingLevel(5)).toBe('MASTERED')
  })

  it('retrieves level configuration with fallback', () => {
    expect(getLevelConfig('MASTERED').label).toBe('Đã nhớ')
    expect(getLevelConfig('UNKNOWN').label).toBe('Chưa biết')
    // @ts-expect-error test fallback
    expect(getLevelConfig('INVALID').label).toBe('Chưa biết')
    expect(getLevelConfig(null).label).toBe('Chưa biết')
  })

  it('formats relative due timestamp properly', () => {
    const baseNow = new Date('2026-10-26T10:00:00Z')

    // No nextReviewAt -> due now
    const immediate = formatRelativeDue(null, baseNow)
    expect(immediate.isDue).toBe(true)
    expect(immediate.text).toBe('Cần ôn ngay')

    // In the past -> is due
    const past = formatRelativeDue('2026-10-26T08:00:00Z', baseNow)
    expect(past.isDue).toBe(true)
    expect(past.text).toBe('Đến hạn ôn')

    // In 4 hours
    const fewHours = formatRelativeDue('2026-10-26T14:00:00Z', baseNow)
    expect(fewHours.isDue).toBe(false)
    expect(fewHours.isToday).toBe(true)
    expect(fewHours.text).toBe('Ôn sau 4 giờ')

    // Tomorrow (26 hours)
    const tomorrow = formatRelativeDue('2026-10-27T12:00:00Z', baseNow)
    expect(tomorrow.isDue).toBe(false)
    expect(tomorrow.text).toBe('Ôn vào ngày mai')

    // In 3 days
    const threeDays = formatRelativeDue('2026-10-29T12:00:00Z', baseNow)
    expect(threeDays.isDue).toBe(false)
    expect(threeDays.text).toBe('Ôn sau 3 ngày')
  })
})
