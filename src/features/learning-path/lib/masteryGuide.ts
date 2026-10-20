import type { Suggestion, SuggestionReason, SuggestionType } from '~types/learningPath'

export type GuideTone = 'accent' | 'primary' | 'success'

export interface ReasonMeta {
  label: string
  /** One line telling the learner why this is offered. */
  hint: string
  tone: GuideTone
}

const REASON_META: Record<SuggestionReason, ReasonMeta> = {
  CONSOLIDATE: { label: 'Cần củng cố', hint: 'Điểm này còn chưa chắc, luyện thêm sẽ vững hơn.', tone: 'accent' },
  DUE: { label: 'Đến hạn ôn', hint: 'Đã đến lúc nhắc lại để không bị quên.', tone: 'primary' },
  NEXT_IN_TREE: { label: 'Bước kế tiếp', hint: 'Bạn đã vững phần nền, điểm này là bước tiếp theo.', tone: 'success' },
}

export function reasonMeta(reason: SuggestionReason): ReasonMeta {
  return REASON_META[reason]
}

const TYPE_LABEL: Record<SuggestionType, string> = {
  PRACTICE_SET: 'Bộ luyện tập',
  PRACTICE_TEST: 'Đề thi thử',
  LESSON: 'Bài học',
}

export function suggestionTypeLabel(type: SuggestionType): string {
  return TYPE_LABEL[type]
}

/** The verb on a suggestion's button; the action decides it, since the same type can open in different ways. */
export function suggestionCtaLabel(suggestion: Suggestion): string {
  switch (suggestion.action.kind) {
    case 'LESSON': return 'Vào học'
    case 'BASKET_REVIEW': return 'Luyện ngay'
    case 'COURSE_LIST': return 'Xem trong khóa học'
  }
}

export function reviewPath(reviewId: string): string {
  return `/learn/reviews/${reviewId}`
}

export interface DueLabel {
  text: string
  /** Due now or already late: the row is drawn with urgency. */
  urgent: boolean
}

const DAY_MS = 86_400_000

/** How far off a review date is, in whole calendar days of the learner's own clock. */
export function dueLabel(dueAt: string | null, now: Date): DueLabel | null {
  if (!dueAt) return null
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return null
  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((startOf(due) - startOf(now)) / DAY_MS)
  if (days < 0) return { text: `Trễ ${-days} ngày`, urgent: true }
  if (days === 0) return { text: 'Đến hạn hôm nay', urgent: true }
  if (days === 1) return { text: 'Ngày mai', urgent: false }
  return { text: `Còn ${days} ngày`, urgent: false }
}

/** The mastery of a point as a whole percent, clamped so a stray value cannot break the ring. */
export function masteryPercentOf(mastery: number): number {
  if (!Number.isFinite(mastery)) return 0
  return Math.min(100, Math.max(0, Math.round(mastery * 100)))
}
