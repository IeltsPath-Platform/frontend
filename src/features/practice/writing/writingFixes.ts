import type { WritingCorrection } from './writingApi'

const FALLBACK_CATEGORY = { label: 'Khác', tone: 'task' }

/** The error categories Content can attach to a correction; one this page does not know falls back to "Khác". */
const CATEGORY: Record<string, { label: string; tone: string }> = {
  GRAMMAR: { label: 'Ngữ pháp', tone: 'grammar' },
  VOCABULARY: { label: 'Từ vựng', tone: 'vocabulary' },
  COHERENCE: { label: 'Mạch lạc', tone: 'coherence' },
  TASK: { label: 'Nội dung', tone: 'task' },
  SPELLING_NUMBER: { label: 'Chính tả & số', tone: 'vocabulary' },
  OTHER: FALLBACK_CATEGORY,
}

export function categoryOf(category: WritingCorrection['category']) {
  return CATEGORY[category] ?? FALLBACK_CATEGORY
}

/** The card a mark in the essay leads to. */
export const fixId = (number: number) => `wr-fix-${number}`

/** A mark of the essay the learner picked; {@code tick} grows with every pick, so picking the same mark again scrolls again. */
export interface ActiveFix {
  number: number
  tick: number
}

/** An excerpt or replacement this long does not fit beside its arrow; the card then stacks them. */
export const LONG_FIX_LENGTH = 64

/** One line of "Các lỗi cần sửa", numbered in the order it appears in the essay. */
export interface FixItem {
  key: string
  /** Position in the essay, from 1, kept when the list is filtered so a line can always be told from the others. */
  number: number
  label: string
  tone: string
  /** What kind of mistake it is (for example "Sai số ít hoặc số nhiều của danh từ"); null when it only repeats the category. */
  name: string | null
  excerpt: string
  /** The replacement; empty when the passage is to be removed. */
  suggestion: string
  reason: string | null
  /** The text is acceptable and a better wording exists: not a mistake. */
  suggestionOnly: boolean
  long: boolean
}

export function buildFixes(corrections: readonly WritingCorrection[]): FixItem[] {
  return corrections.map((item, index) => {
    const category = categoryOf(item.category)
    const name = item.errorName?.trim() || null
    const suggestion = item.suggestion ?? ''
    return {
      key: `${index}-${item.excerpt}`,
      number: index + 1,
      label: category.label,
      tone: category.tone,
      name: name && name !== category.label ? name : null,
      excerpt: item.excerpt,
      suggestion,
      reason: item.reason?.trim() || null,
      suggestionOnly: item.certainty === 'SUGGESTION',
      long: item.excerpt.length > LONG_FIX_LENGTH || suggestion.length > LONG_FIX_LENGTH,
    }
  })
}

export interface FixGroup {
  label: string
  tone: string
  count: number
}

/** How many lines each category holds, the biggest first; the filter buttons and the bar above the list are drawn from it. */
export function groupFixes(items: readonly FixItem[]): FixGroup[] {
  const groups = new Map<string, FixGroup>()
  for (const item of items) {
    const group = groups.get(item.label) ?? { label: item.label, tone: item.tone, count: 0 }
    group.count += 1
    groups.set(item.label, group)
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'vi'))
}

/** Mistakes and suggestions are counted apart: a suggestion is acceptable text with a better wording, not an error. */
export function countFixes(items: readonly FixItem[]) {
  const suggestions = items.filter((item) => item.suggestionOnly).length
  return { errors: items.length - suggestions, suggestions }
}
