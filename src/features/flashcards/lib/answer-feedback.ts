import { normalizeAnswer } from './study'

export type AnswerKind = 'correct' | 'accent' | 'typo' | 'mixed-up' | 'blank' | 'wrong'

/** Strips Vietnamese and Latin diacritics and tones for comparison. */
export function stripDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[.,!?;:"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Compute standard Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const row = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    let prev = i
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1
      row[j - 1] = prev
      prev = val
    }
    row[b.length] = prev
  }

  return row[b.length]
}

/**
 * Classifies a learner's answer against the expected answer and alternative answers.
 * Returns one of:
 * - 'correct': matches normalized expected
 * - 'accent': matches when accents/tones are stripped
 * - 'typo': Levenshtein distance <= 2 (or <= 1 for short words <= 4 chars)
 * - 'mixed-up': matches one of the other answers in the deck
 * - 'blank': empty or whitespace only
 * - 'wrong': none of the above
 */
export function classifyAnswer(
  given: string,
  expected: string,
  otherAnswers: readonly string[] = []
): AnswerKind {
  const normGiven = normalizeAnswer(given)
  const normExpected = normalizeAnswer(expected)

  if (!given.trim() || !normGiven) {
    return 'blank'
  }

  if (normGiven === normExpected) {
    return 'correct'
  }

  // Mixed-up check: matched another card's answer in the deck
  const isMixedUp = otherAnswers.some((other) => {
    const normOther = normalizeAnswer(other)
    return normOther.length > 0 && normOther !== normExpected && normOther === normGiven
  })
  if (isMixedUp) {
    return 'mixed-up'
  }

  // Accent check: only diacritics/accents differ
  const strippedGiven = stripDiacritics(given)
  const strippedExpected = stripDiacritics(expected)
  if (strippedGiven.length > 0 && strippedGiven === strippedExpected) {
    return 'accent'
  }

  // Typo check: Levenshtein distance <= 1 for words <= 4 chars, <= 2 for longer
  const maxDist = normExpected.length <= 4 ? 1 : 2
  const dist = levenshtein(normGiven, normExpected)
  if (dist <= maxDist) {
    return 'typo'
  }

  return 'wrong'
}

