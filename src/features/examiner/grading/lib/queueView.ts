import { waitText } from '@/features/admin/examiner-review/lib/reviewLabels'
import type { CompletedItem, GradingEntry } from '../types'
import { GRADING_DEADLINE_SECONDS, isInProgress, remainingSeconds } from './gradingLabels'

export const QUEUE_PAGE_SIZE = 10

export type QueueTab = 'ALL' | 'QUEUED' | 'PROCESSING'
/** The deadline is 48 hours after the learner chose the examiner, so the job that waited longest is due first. */
export type QueueSort = 'DUE_FIRST' | 'DUE_LAST'

export interface QueueFilters { tab: QueueTab; source: string; search: string; sort: QueueSort }

/** A short code to tell jobs apart on screen and to search by. */
export const jobCode = (id: string) => `#${id.slice(0, 6).toUpperCase()}`

/** What a job came from, as the source filter groups it. */
export const sourceKey = (entry: Pick<GradingEntry, 'attemptType' | 'source'>) => entry.attemptType ?? entry.source ?? ''

/** "Còn 1 ngày 20 giờ" is not what the table needs; one unit is enough: "Còn 2 ngày", "Quá hạn 3 giờ". */
export function deadlineText(entry: Pick<GradingEntry, 'overdue' | 'waitSeconds'>) {
  return entry.overdue
    ? `Quá hạn ${waitText(Math.max(0, entry.waitSeconds - GRADING_DEADLINE_SECONDS))}`
    : `Còn ${waitText(remainingSeconds(entry.waitSeconds))}`
}

export function countByTab(entries: readonly GradingEntry[]): Record<QueueTab, number> {
  return {
    ALL: entries.length,
    QUEUED: entries.filter((entry) => !isInProgress(entry)).length,
    PROCESSING: entries.filter(isInProgress).length,
  }
}

const inTab = (entry: GradingEntry, tab: QueueTab) =>
  tab === 'ALL' || (tab === 'PROCESSING') === isInProgress(entry)

/** The jobs to show: the tab's state, one source, a code search, and the order of the deadline. */
export function viewQueue(entries: readonly GradingEntry[], { tab, source, search, sort }: QueueFilters): GradingEntry[] {
  const needle = search.trim().replace(/^#/, '').toUpperCase()
  const rows = entries.filter((entry) =>
    inTab(entry, tab)
    && (source === '' || sourceKey(entry) === source)
    && (needle === '' || jobCode(entry.id).slice(1).includes(needle)))
  const direction = sort === 'DUE_FIRST' ? -1 : 1
  return rows.sort((a, b) => direction * (a.waitSeconds - b.waitSeconds) || a.id.localeCompare(b.id))
}

/** The finished jobs to show (newest first, as the server sends them): one source and a code search. */
export function viewCompleted(items: readonly CompletedItem[], { source, search }: Pick<QueueFilters, 'source' | 'search'>): CompletedItem[] {
  const needle = search.trim().replace(/^#/, '').toUpperCase()
  return items.filter((item) =>
    (source === '' || (item.source ?? '') === source) && (needle === '' || jobCode(item.jobId).slice(1).includes(needle)))
}

export const pageCount =(total: number) => Math.max(1, Math.ceil(total / QUEUE_PAGE_SIZE))
