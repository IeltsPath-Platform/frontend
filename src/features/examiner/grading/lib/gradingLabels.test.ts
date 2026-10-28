import { describe, expect, it } from 'vitest'
import { GRADING_REMINDER_SECONDS, isDueSoon, overallWorking, statusBadge, suggestedBand } from './gradingLabels'

const job = (overrides = {}) => ({ status: 'QUEUED', overdue: false, hasDraft: false, waitSeconds: 3600, ...overrides })

describe('a job that will be late soon', () => {
  it('is due soon from 36 hours until it is late, and not before or after', () => {
    expect(isDueSoon(job({ waitSeconds: GRADING_REMINDER_SECONDS - 1 }))).toBe(false)
    expect(isDueSoon(job({ waitSeconds: GRADING_REMINDER_SECONDS }))).toBe(true)
    expect(isDueSoon(job({ waitSeconds: 47 * 3600 }))).toBe(true)
    expect(isDueSoon(job({ waitSeconds: 49 * 3600, overdue: true }))).toBe(false)
  })

  it('shows late first, then a job being graded, then due soon, then plain waiting', () => {
    expect(statusBadge(job({ waitSeconds: 50 * 3600, overdue: true }))).toEqual({ label: 'Quá hạn', tone: 'danger' })
    expect(statusBadge(job({ status: 'PROCESSING', waitSeconds: 40 * 3600 }))).toEqual({ label: 'Đang chấm', tone: 'ok' })
    expect(statusBadge(job({ status: 'PROCESSING', hasDraft: true }))).toEqual({ label: 'Đang chấm · có nháp', tone: 'warn' })
    expect(statusBadge(job({ hasDraft: true }))).toEqual({ label: 'Đang chấm · có nháp', tone: 'warn' })
    expect(statusBadge(job({ waitSeconds: 40 * 3600 }))).toEqual({ label: 'Sắp quá hạn', tone: 'warn' })
    expect(statusBadge(job())).toEqual({ label: 'Chờ chấm', tone: 'muted' })
  })
})

describe('the overall band', () => {
  const scores = (taskResponse: number | null, coherence: number | null, lexical: number | null, grammar: number | null) => ({ taskResponse, coherence, lexical, grammar })

  it('is the mean of the four criteria rounded to the nearest half band, quarters going up as IELTS rounds', () => {
    expect(suggestedBand(scores(6, 6, 6, 6))).toBe(6)
    expect(suggestedBand(scores(6, 6, 6.5, 6.5))).toBe(6.5)   // 6.25 → 6.5
    expect(suggestedBand(scores(6.5, 7, 7, 7))).toBe(7)       // 6.875 → 7.0
    expect(suggestedBand(scores(6, 6.5, 7, 7))).toBe(6.5)     // 6.625 is nearer 6.5 than 7.0
    expect(suggestedBand(scores(6.5, 6.5, 7, 7))).toBe(7)     // 6.75 → 7.0
    expect(suggestedBand(scores(6, 6, 6, 6.5))).toBe(6)       // 6.125 → 6.0
    expect(suggestedBand(scores(5.5, 5.5, 5.5, 6))).toBe(5.5) // 5.625 → 5.5
    expect(suggestedBand(scores(0, 0, 0, 0.5))).toBe(0)       // 0.125 → 0
    expect(suggestedBand(scores(9, 9, 9, 9))).toBe(9)
  })

  it('does not exist until all four criteria have a band', () => {
    expect(suggestedBand(scores(6, 6, 6, null))).toBeNull()
    expect(overallWorking(scores(null, null, null, null))).toBeNull()
  })

  it('shows its working: the four bands, their mean and the band after rounding', () => {
    expect(overallWorking(scores(6, 6.5, 7, 6.5))).toEqual({ bands: [6, 6.5, 7, 6.5], mean: 6.5, band: 6.5 })
    expect(overallWorking(scores(6, 6.5, 5.5, 6.5))).toEqual({ bands: [6, 6.5, 5.5, 6.5], mean: 6.125, band: 6 })
  })
})
