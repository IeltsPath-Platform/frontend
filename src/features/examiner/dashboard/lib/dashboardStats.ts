import type { Slice } from '@/features/admin/overview/components/OverviewCharts'
import type { CompletedItem } from '../../grading/types'
import type { Summary } from '../types'

/*
 * What the dashboard charts draw. Every function is pure: the page hands in the server's numbers (and, for the
 * 7-day chart, the moment they were loaded), so the same input always gives the same chart.
 */

type QueueCounts = Pick<Summary, 'queued' | 'processing' | 'dueSoon' | 'overdue'>

/** Jobs still open: waiting for the examiner or being graded. */
export const openJobs = (summary: Pick<Summary, 'queued' | 'processing'>) => summary.queued + summary.processing

/**
 * Open jobs by deadline. A job that is late soon or late is also an open job, so what is left is "on time" and the three
 * parts never overlap and add up to the open jobs.
 */
export function deadlineSlices(summary: QueueCounts): Slice[] {
  const open = openJobs(summary)
  const late = Math.min(summary.overdue, open)
  const soon = Math.min(summary.dueSoon, open - late)
  return [
    { key: 'on-time', label: 'Còn hạn', value: open - late - soon, color: 'var(--adm-accent)' },
    { key: 'due-soon', label: 'Sắp quá hạn', value: soon, color: 'var(--adm-warn)' },
    { key: 'overdue', label: 'Quá hạn', value: late, color: 'var(--adm-danger)' },
  ]
}

/** Today's intake against the daily limit; null when the limit is not known. */
export function intakeSlices(summary: Pick<Summary, 'receivedToday' | 'dailyLimit'>): Slice[] | null {
  if (!summary.dailyLimit) return null
  const taken = Math.min(summary.receivedToday, summary.dailyLimit)
  return [
    { key: 'taken', label: 'Đã nhận', value: taken, color: 'var(--adm-accent)' },
    { key: 'left', label: 'Còn nhận được', value: summary.dailyLimit - taken, color: 'var(--adm-border)' },
  ]
}

const pad = (value: number) => String(value).padStart(2, '0')
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Finished jobs per day for the last `days` days ending on the day of `now`, oldest first, days without any included. */
export function lastDays(items: readonly CompletedItem[], days: number, now: Date): Slice[] {
  const perDay = new Map<string, number>()
  for (const item of items) {
    if (!item.completedAt) continue
    const at = new Date(item.completedAt)
    if (Number.isNaN(at.getTime())) continue
    const key = dayKey(at)
    perDay.set(key, (perDay.get(key) ?? 0) + 1)
  }
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - index))
    const key = dayKey(day)
    return { key, label: `${pad(day.getDate())}/${pad(day.getMonth() + 1)}`, value: perDay.get(key) ?? 0, color: 'var(--adm-accent)' }
  })
}

/** Band columns: everything up to 5.0 together, then each half band, everything from 8.0 together. */
export const BAND_LABELS = ['≤5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '≥8.0'] as const

export function bandColumns(items: readonly CompletedItem[]): Slice[] {
  const counts = BAND_LABELS.map(() => 0)
  for (const { band } of items) {
    counts[Math.min(BAND_LABELS.length - 1, Math.max(0, Math.round((band - 5) * 2)))] += 1
  }
  return BAND_LABELS.map((label, index) => ({ key: label, label, value: counts[index], color: 'var(--adm-accent)' }))
}

/** The mean overall band of the jobs, or null with none. */
export function averageBand(items: readonly CompletedItem[]): number | null {
  return items.length === 0 ? null : items.reduce((total, item) => total + item.band, 0) / items.length
}

/** Jobs grouped by a label, the biggest group first and equal groups in alphabetical order. */
export function countBy(items: readonly CompletedItem[], label: (item: CompletedItem) => string): Slice[] {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(label(item), (counts.get(label(item)) ?? 0) + 1)
  return [...counts]
    .sort(([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB, 'vi'))
    .map(([name, value]) => ({ key: name, label: name, value, color: 'var(--adm-accent)' }))
}
