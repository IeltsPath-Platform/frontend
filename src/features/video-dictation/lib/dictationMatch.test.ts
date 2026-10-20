import { describe, expect, it } from 'vitest'
import { PASS_THRESHOLD_PERCENT, countWords, matchDictation } from './dictationMatch'

const SENTENCE = 'She goes to school every day'

describe('matchDictation', () => {
  it('passes an exact answer at 100%', () => {
    const result = matchDictation(SENTENCE, 'She goes to school every day')

    expect(result.accuracyPercent).toBe(100)
    expect(result.correct).toBe(true)
    expect(result.missingWords).toBe(0)
    expect(result.typed.every((word) => word.correct)).toBe(true)
  })

  it('ignores case, punctuation, spacing and typographic apostrophes', () => {
    expect(matchDictation(SENTENCE, '  she  GOES, to school; every day!  ').correct).toBe(true)
    expect(matchDictation("And that's pretty much all", 'and that’s pretty much all.').accuracyPercent).toBe(100)
    expect(matchDictation('a well-known story', 'a well known story').accuracyPercent).toBe(100)
  })

  it('scores one wrong word of six at 83.33% and marks it', () => {
    const result = matchDictation(SENTENCE, 'She go to school every day')

    expect(result.accuracyPercent).toBe(83.33)
    expect(result.correct).toBe(false)
    expect(result.typed.map((word) => word.correct)).toEqual([true, false, true, true, true, true])
    expect(result.missingWords).toBe(1)
  })

  it('counts left-out words and extra words as mistakes', () => {
    expect(matchDictation(SENTENCE, 'She goes school').accuracyPercent).toBe(50)
    const extra = matchDictation(SENTENCE, 'She goes to the school every day')
    expect(extra.matchedWords).toBe(6)
    expect(extra.accuracyPercent).toBe(85.71)
    expect(extra.typed.find((word) => word.text === 'the')?.correct).toBe(false)
  })

  it('keeps word order: a swapped pair is not a full match', () => {
    expect(matchDictation('one two three four five six seven eight nine ten', 'two one three four five six seven eight nine ten').accuracyPercent)
      .toBe(90)
  })

  it('treats an empty or punctuation-only answer as zero', () => {
    expect(matchDictation(SENTENCE, '').accuracyPercent).toBe(0)
    expect(matchDictation(SENTENCE, '... ,').correct).toBe(false)
  })

  it('passes from the threshold up', () => {
    expect(PASS_THRESHOLD_PERCENT).toBe(90)
    const ten = 'one two three four five six seven eight nine ten'
    expect(matchDictation(ten, 'one two three four five six seven eight nine').correct).toBe(true)
    expect(matchDictation(ten, 'one two three four five six seven eight').correct).toBe(false)
  })
})

describe('countWords', () => {
  it('counts the words used for matching', () => {
    expect(countWords(SENTENCE)).toBe(6)
    expect(countWords('Thank you.')).toBe(2)
  })
})
