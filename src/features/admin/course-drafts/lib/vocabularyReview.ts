import type { VocabularyHit } from '../../lessons/api/lessonApi'
import type { CourseNewWord } from '../types'

export type LibrarySense = NonNullable<VocabularyHit['senses']>[number]

/**
 * Where a proposed word stands against the library, which decides what approval will do with it:
 * - `new`: the library lacks the word, so approval creates it with this meaning;
 * - `same`: the library has this part of speech and meaning, so approval reuses it;
 * - `different`: the library has the word under other meanings, so approval adds this one beside them. `similar` is the
 *   library sense that reads like the proposal, when there is one, and then the author is advised to adopt it.
 */
export type WordReview =
  | { kind: 'new' }
  | { kind: 'same'; sense: LibrarySense }
  | { kind: 'different'; senses: LibrarySense[]; similar: LibrarySense | null }

const squash = (text: string | null | undefined) => (text ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const tokens = (text: string | null | undefined) => new Set(squash(text).split(/[\s,;/()]+/).filter(Boolean))

/** The same rule as Library applies on approval: same part of speech and the same Vietnamese meaning, ignoring case and spacing. */
export function sameMeaning(word: CourseNewWord, sense: LibrarySense): boolean {
  return sense.partOfSpeech === word.partOfSpeech && !!sense.vietnameseMeaning && squash(sense.vietnameseMeaning) === squash(word.vietnameseMeaning)
}

/** Whether two meanings read alike: one holds the other, or at least half of their words are shared. */
export function similarMeaning(first: string | null | undefined, second: string | null | undefined): boolean {
  const a = squash(first)
  const b = squash(second)
  if (!a || !b) return false
  if (a.includes(b) || b.includes(a)) return true
  const left = tokens(a)
  const right = tokens(b)
  const shared = [...left].filter((token) => right.has(token)).length
  return shared / new Set([...left, ...right]).size >= 0.5
}

export function reviewWord(word: CourseNewWord, hit: VocabularyHit | undefined): WordReview {
  const senses = (hit?.senses ?? []).filter((sense) => sense.status !== 'INACTIVE')
  if (!senses.length) return { kind: 'new' }
  const same = senses.find((sense) => sameMeaning(word, sense))
  if (same) return { kind: 'same', sense: same }
  const similar = senses.find((sense) => sense.partOfSpeech === word.partOfSpeech && similarMeaning(sense.vietnameseMeaning, word.vietnameseMeaning)) ?? null
  return { kind: 'different', senses, similar }
}

const meaningOf = (sense: LibrarySense) => sense.vietnameseMeaning ?? sense.englishDefinition ?? ''

/** The advice shown with a word the library has under other meanings. Plain words, one decision: keep the proposal or adopt the library. */
export function reviewAdvice(word: CourseNewWord, review: Extract<WordReview, { kind: 'different' }>): string {
  if (review.similar) {
    return `Nghĩa gần giống “${meaningOf(review.similar)}” đã có trong thư viện. Nên dùng nghĩa thư viện để không thêm một nghĩa trùng.`
  }
  const samePart = review.senses.some((sense) => sense.partOfSpeech === word.partOfSpeech)
  return samePart
    ? `Thư viện chưa có nghĩa “${word.vietnameseMeaning}” cho từ này. Nếu bài dùng từ theo nghĩa đó thì giữ để thêm nghĩa mới; nếu không thì dùng nghĩa thư viện.`
    : `Thư viện có từ này ở loại từ khác. Nếu bài dùng nó với loại từ và nghĩa đang đề xuất thì giữ để thêm nghĩa mới; nếu không thì dùng nghĩa thư viện.`
}
