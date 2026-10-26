import type { CriterionKey, ExaminerQuality, QueueEntry } from '../types'

export const BLIND_NOTE = 'Đây là chấm mù. Chấm theo rubric, không cần đoán điểm giám khảo.'
export const QUALITY_NOTE = 'Ít bài thì số liệu chưa đáng tin.'

/** The mean of the four criteria rounded to the nearest half band, as IELTS rounds an overall band. */
export function overallBand(criteria: Record<CriterionKey, number>) {
  const mean = (criteria.taskResponse + criteria.coherence + criteria.lexical + criteria.grammar) / 4
  return Math.round(mean * 2) / 2
}

export function taskLabel(task: string | null | undefined) {
  return task === 'TASK_1' ? 'Task 1' : task === 'TASK_2' ? 'Task 2' : 'Chưa rõ Task'
}

const SOURCE_LABEL: Record<string, string> = {
  TOPIC_GATE: 'Thi cuối chủ đề',
  COURSE_GATE: 'Thi cuối khóa',
  PLACEMENT: 'Thi xếp lớp',
  MOCK: 'Thi thử',
  PRACTICE: 'Luyện tập',
  LESSON: 'Bài học',
}

export function sourceLabel(entry: Pick<QueueEntry, 'attemptType' | 'source'>) {
  const key = entry.attemptType ?? entry.source ?? ''
  return SOURCE_LABEL[key] ?? (key || 'Không rõ nguồn')
}

/** How long a job has waited, as a short Vietnamese phrase. */
export function waitText(seconds: number) {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} phút`
  if (seconds < 86400) return `${Math.round(seconds / 3600)} giờ`
  return `${Math.round(seconds / 86400)} ngày`
}

export const shortId = (id: string) => id.slice(0, 8)

/** Examiners with the biggest average difference first, as the contract's table is read. */
export function byDifference(rows: readonly ExaminerQuality[]) {
  return [...rows].sort((a, b) => b.averageAbsoluteBandDifference - a.averageAbsoluteBandDifference)
}

export const percentText = (ratio: number) => `${(ratio * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`
