import { deadlineText } from '../../grading/lib/queueView'
import { isDueSoon, isInProgress } from '../../grading/lib/gradingLabels'
import type { GradingEntry } from '../../grading/types'

/** Why a job is on the dashboard: the three things that cannot wait, most urgent first. */
export type AttentionReason = 'OVERDUE' | 'DUE_SOON' | 'IN_PROGRESS'

export interface Attention { entry: GradingEntry; reason: AttentionReason }

/** The dashboard shows only a few jobs: it says what to do now, the queue is where the whole list lives. */
export const ATTENTION_LIMIT = 3

const RANK: Record<AttentionReason, number> = { OVERDUE: 0, DUE_SOON: 1, IN_PROGRESS: 2 }

export function reasonOf(entry: GradingEntry): AttentionReason | null {
  if (entry.overdue) return 'OVERDUE'
  if (isDueSoon(entry)) return 'DUE_SOON'
  if (isInProgress(entry)) return 'IN_PROGRESS'
  return null
}

/**
 * The jobs that need attention now: late ones first, then ones that will be late soon, then ones the examiner started and
 * left. Within each group the job that waited longest comes first. A job that is only waiting is not on the list.
 */
export function needsAttention(entries: readonly GradingEntry[]): Attention[] {
  return entries
    .flatMap((entry) => { const reason = reasonOf(entry); return reason ? [{ entry, reason }] : [] })
    .sort((a, b) => RANK[a.reason] - RANK[b.reason] || b.entry.waitSeconds - a.entry.waitSeconds || a.entry.id.localeCompare(b.entry.id))
}

/** One line saying why the job is shown and what it costs to leave it. */
export function whyText({ entry, reason }: Attention): string {
  if (reason === 'OVERDUE') return `${deadlineText(entry)}. Chấm sớm kẻo học viên đổi giáo viên.`
  if (reason === 'DUE_SOON') return `${deadlineText(entry)} là đến hạn chấm.`
  return `${entry.hasDraft ? 'Bạn đang chấm dở và đã lưu nháp' : 'Bạn đã nhận bài này nhưng chưa chấm xong'} · ${deadlineText(entry).toLowerCase()}.`
}
