import { describe, expect, it } from 'vitest'
import { GRADING_REMINDER_SECONDS, isDueSoon, statusBadge } from './gradingLabels'

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
