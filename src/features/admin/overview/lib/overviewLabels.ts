import type { QuestionStat } from '../types'

export const WORK_KIND_LABEL: Record<string, string> = {
  CONTENT_GAP: 'Thiếu bộ câu hỏi ôn tập',
  QUESTION_TOO_EASY: 'Câu hỏi quá dễ',
  QUESTION_TOO_HARD: 'Câu hỏi quá khó',
  EDGE_SUSPECT: 'Cạnh tiên quyết đáng ngờ',
}

export const WORK_STATUS_LABEL: Record<string, string> = { OPEN: 'Mới', IN_PROGRESS: 'Đang làm', DONE: 'Xong' }

/** Skills in display order, with the colour token each one already has in the admin theme. */
export const SKILL_ROWS: { key: string; label: string; color: string }[] = [
  { key: 'LISTENING', label: 'Nghe', color: 'var(--adm-skill-listening)' },
  { key: 'READING', label: 'Đọc', color: 'var(--adm-skill-reading)' },
  { key: 'WRITING', label: 'Viết', color: 'var(--adm-skill-writing)' },
  { key: 'SPEAKING', label: 'Nói', color: 'var(--adm-skill-speaking)' },
  { key: 'ALL', label: 'Chung', color: 'var(--adm-skill-all)' },
]

/** CEFR levels low to high; `NONE` is the count of active points that have no level yet. */
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export const LESSON_STATUS_ROWS: { key: string; label: string; color: string }[] = [
  { key: 'PUBLISHED', label: 'Đã xuất bản', color: 'var(--adm-ok)' },
  { key: 'DRAFT', label: 'Bản nháp', color: 'var(--adm-warn)' },
  { key: 'ARCHIVED', label: 'Đã lưu trữ', color: 'var(--adm-muted)' },
]

const numberFormat = new Intl.NumberFormat('vi-VN')
export const formatCount = (value: number) => numberFormat.format(value)

export const correctRate =(stat: QuestionStat) => (stat.attempts === 0 ? 0 : stat.correct / stat.attempts)

export const percent = (ratio: number) => `${Math.round(ratio * 100)}%`

/** The `count` questions with the lowest correct rate, then the `count` with the highest, each side once. */
export function extremes(stats: readonly QuestionStat[], count: number) {
  const sorted = [...stats].sort((a, b) => correctRate(a) - correctRate(b))
  const hardest = sorted.slice(0, count)
  const easiest = sorted.slice(-count).reverse().filter((stat) => !hardest.includes(stat))
  return { hardest, easiest }
}
