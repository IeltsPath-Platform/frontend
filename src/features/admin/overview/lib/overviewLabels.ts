import type { QuestionStat } from '../types'

export const WORK_KIND_LABEL: Record<string, string> = {
  CONTENT_GAP: 'Thiếu bộ câu hỏi ôn tập',
  QUESTION_TOO_EASY: 'Câu hỏi quá dễ',
  QUESTION_TOO_HARD: 'Câu hỏi quá khó',
  EDGE_SUSPECT: 'Cạnh tiên quyết đáng ngờ',
}

export const WORK_STATUS_LABEL: Record<string, string> = { OPEN: 'Mới', IN_PROGRESS: 'Đang làm', DONE: 'Xong' }

export const correctRate = (stat: QuestionStat) => (stat.attempts === 0 ? 0 : stat.correct / stat.attempts)

export const percent = (ratio: number) => `${Math.round(ratio * 100)}%`

/** The `count` questions with the lowest correct rate, then the `count` with the highest, each side once. */
export function extremes(stats: readonly QuestionStat[], count: number) {
  const sorted = [...stats].sort((a, b) => correctRate(a) - correctRate(b))
  const hardest = sorted.slice(0, count)
  const easiest = sorted.slice(-count).reverse().filter((stat) => !hardest.includes(stat))
  return { hardest, easiest }
}
