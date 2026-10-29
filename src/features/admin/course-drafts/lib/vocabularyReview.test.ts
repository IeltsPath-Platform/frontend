import { describe, expect, it } from 'vitest'
import type { VocabularyHit } from '../../lessons/api/lessonApi'
import type { CourseNewWord } from '../types'
import { reviewAdvice, reviewWord, sameMeaning, similarMeaning } from './vocabularyReview'

const word = (patch: Partial<CourseNewWord> = {}): CourseNewWord => ({
  lemma: 'sentence', ipa: null, partOfSpeech: 'NOUN', englishDefinition: null, vietnameseMeaning: 'câu', exampleSentence: 'A sentence.', ...patch,
})
const hit = (...senses: NonNullable<VocabularyHit['senses']>): VocabularyHit => ({ id: 'item', lemma: 'sentence', senses } as VocabularyHit)
const sense = (patch: Record<string, unknown> = {}) => ({ id: 's1', status: 'ACTIVE', partOfSpeech: 'NOUN', vietnameseMeaning: 'bản án', ...patch }) as NonNullable<VocabularyHit['senses']>[number]

describe('vocabularyReview', () => {
  it('treats a word the library lacks, or holds with no active sense, as new', () => {
    expect(reviewWord(word(), undefined)).toEqual({ kind: 'new' })
    expect(reviewWord(word(), hit())).toEqual({ kind: 'new' })
    expect(reviewWord(word(), hit(sense({ status: 'INACTIVE' })))).toEqual({ kind: 'new' })
  })

  it('finds the same meaning by part of speech and text, ignoring case and spacing', () => {
    const same = sense({ id: 'same', vietnameseMeaning: '  CÂU ' })
    expect(sameMeaning(word(), same)).toBe(true)
    expect(sameMeaning(word({ partOfSpeech: 'VERB' }), same)).toBe(false)
    expect(sameMeaning(word(), sense({ vietnameseMeaning: null }))).toBe(false)
    expect(reviewWord(word(), hit(sense(), same))).toEqual({ kind: 'same', sense: same })
  })

  it('reads two meanings as alike when one holds the other or they share half their words', () => {
    expect(similarMeaning('xu hướng', 'xu hướng, chiều hướng')).toBe(true)
    expect(similarMeaning('làm giảm bớt', 'làm giảm')).toBe(true)
    expect(similarMeaning('câu', 'bản án')).toBe(false)
    expect(similarMeaning('xu thế', 'xu hướng')).toBe(false)
    expect(similarMeaning('', 'câu')).toBe(false)
  })

  it('names the library sense that reads like the proposal, of the same part of speech only', () => {
    const like = sense({ id: 'like', vietnameseMeaning: 'câu văn' })
    expect(reviewWord(word(), hit(sense(), like))).toMatchObject({ kind: 'different', similar: like })
    expect(reviewWord(word(), hit(sense({ partOfSpeech: 'VERB', vietnameseMeaning: 'câu văn' })))).toMatchObject({ kind: 'different', similar: null })
  })

  it('advises adopting a similar meaning, adding a new one otherwise, and says when the part of speech differs', () => {
    const similar = reviewWord(word(), hit(sense({ vietnameseMeaning: 'câu văn' })))
    const other = reviewWord(word(), hit(sense()))
    const otherPart = reviewWord(word(), hit(sense({ partOfSpeech: 'VERB' })))
    if (similar.kind !== 'different' || other.kind !== 'different' || otherPart.kind !== 'different') throw new Error('expected different')

    expect(reviewAdvice(word(), similar)).toMatch(/Nên dùng nghĩa thư viện/)
    expect(reviewAdvice(word(), other)).toMatch(/chưa có nghĩa “câu”/)
    expect(reviewAdvice(word(), otherPart)).toMatch(/loại từ khác/)
  })
})
