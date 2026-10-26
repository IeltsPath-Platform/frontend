import { overallBand } from '@/features/admin/examiner-review/lib/reviewLabels'
import { CRITERIA, type CriterionKey } from '@/features/admin/examiner-review/types'
import type { GradingEntry } from '../types'

export const BLIND_NOTE = 'Bạn không thấy tên học viên. Chấm theo rubric, ghi lỗi trực tiếp trên bài viết.'
export const UNSUPPORTED_NOTE = 'Bài của bài thi (thi thử, thi cuối chủ đề hoặc khóa) chưa chấm được trên màn hình này.'

/** A learner can replace an examiner who has not graded 48 hours after being chosen (human-review-v1). */
export const GRADING_DEADLINE_SECONDS = 48 * 3600

export const BANDS = Array.from({ length: 19 }, (_, index) => index / 2)

/** Only work that is not part of an exam attempt has the structured review (band, criteria, marked errors). */
export const canGradeHere = (entry: Pick<GradingEntry, 'attemptId'>) => !entry.attemptId

export type Scores = Record<CriterionKey, number | null>
export type Comments = Record<CriterionKey, string>

export const emptyScores = (): Scores => ({ taskResponse: null, coherence: null, lexical: null, grammar: null })
export const emptyComments = (): Comments => ({ taskResponse: '', coherence: '', lexical: '', grammar: '' })

/** The suggested overall band, once all four criteria have one. */
export function suggestedBand(scores: Scores): number | null {
  const { taskResponse, coherence, lexical, grammar } = scores
  if (taskResponse === null || coherence === null || lexical === null || grammar === null) return null
  return overallBand({ taskResponse, coherence, lexical, grammar })
}

export interface Checklist { allGraded: boolean; allCommented: boolean; hasFeedback: boolean; ready: boolean }

export function checklist(scores: Scores, comments: Comments, feedback: string): Checklist {
  const allGraded = CRITERIA.every(({ key }) => scores[key] !== null)
  const allCommented = CRITERIA.every(({ key }) => comments[key].trim() !== '')
  const hasFeedback = feedback.trim() !== ''
  return { allGraded, allCommented, hasFeedback, ready: allGraded && allCommented && hasFeedback }
}

/** The examiner is reminded once a job has waited this long: 12 hours before it is late (human-review-v1). */
export const GRADING_REMINDER_SECONDS = 36 * 3600

/** Past the reminder time but not late yet: the examiner should give the job priority. */
export const isDueSoon = (entry: Pick<GradingEntry, 'overdue' | 'waitSeconds'>) =>
  !entry.overdue && entry.waitSeconds >= GRADING_REMINDER_SECONDS

/** A job is being graded once it was taken (`PROCESSING`) or the examiner saved a draft for it; saving a draft alone leaves it `QUEUED`. */
export const isInProgress = (entry: Pick<GradingEntry, 'status' | 'hasDraft'>) =>
  entry.status === 'PROCESSING' || (entry.status === 'QUEUED' && entry.hasDraft === true)

export function statusBadge(entry: Pick<GradingEntry, 'status' | 'overdue' | 'hasDraft' | 'waitSeconds'>): { label: string; tone: 'muted' | 'ok' | 'warn' | 'danger' } {
  if (entry.overdue) return { label: 'Quá hạn', tone: 'danger' }
  if (isInProgress(entry)) return entry.hasDraft ? { label: 'Đang chấm · có nháp', tone: 'warn' } : { label: 'Đang chấm', tone: 'ok' }
  if (isDueSoon(entry)) return { label: 'Sắp quá hạn', tone: 'warn' }
  return { label: 'Chờ chấm', tone: 'muted' }
}

/** What is left of the 48 hours, for the "Hạn chấm" column. */
export function remainingSeconds(waitSeconds: number) {
  return Math.max(0, GRADING_DEADLINE_SECONDS - waitSeconds)
}

export function timeOfDay(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
