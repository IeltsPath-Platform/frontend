import { describe, expect, it } from 'vitest'
import { classifyAnswer, levenshtein, stripDiacritics } from './answer-feedback'

describe('stripDiacritics', () => {
  it('removes Vietnamese accents and converts case', () => {
    expect(stripDiacritics('Môi trường')).toBe('moi truong')
    expect(stripDiacritics('Đường phố')).toBe('duong pho')
    expect(stripDiacritics('Tiếng Anh')).toBe('tieng anh')
  })
})

describe('levenshtein', () => {
  it('calculates distance correctly', () => {
    expect(levenshtein('', '')).toBe(0)
    expect(levenshtein('cat', 'cat')).toBe(0)
    expect(levenshtein('cat', 'car')).toBe(1)
    expect(levenshtein('pollution', 'polution')).toBe(1)
    expect(levenshtein('pollution', 'pollusion')).toBe(1)
    expect(levenshtein('pollution', 'polusion')).toBe(2)
    expect(levenshtein('cat', 'dog')).toBe(3)
  })
})

describe('classifyAnswer', () => {
  const otherDeckAnswers = ['conservation', 'habitat', 'biodiversity']

  it('classifies empty or whitespace input as blank', () => {
    expect(classifyAnswer('', 'environment')).toBe('blank')
    expect(classifyAnswer('   ', 'environment')).toBe('blank')
  })

  it('classifies exact match as correct', () => {
    expect(classifyAnswer('environment', 'environment')).toBe('correct')
    expect(classifyAnswer('  Environment  ', 'environment')).toBe('correct')
    expect(classifyAnswer('pollution.', 'pollution')).toBe('correct')
  })

  it('classifies answer matching another card in deck as mixed-up', () => {
    expect(classifyAnswer('habitat', 'environment', otherDeckAnswers)).toBe('mixed-up')
    expect(classifyAnswer('conservation', 'environment', otherDeckAnswers)).toBe('mixed-up')
  })

  it('classifies Vietnamese accent or diacritic mismatch as accent', () => {
    expect(classifyAnswer('moi truong', 'môi trường')).toBe('accent')
    expect(classifyAnswer('MÔI TRƯƠNG', 'môi trường')).toBe('accent')
    expect(classifyAnswer('tieng anh', 'tiếng anh')).toBe('accent')
    expect(classifyAnswer('duong pho', 'đường phố')).toBe('accent')
  })

  it('classifies small spelling mistake as typo for short and long words', () => {
    // Short word (<= 4 chars): max dist 1
    expect(classifyAnswer('car', 'cat')).toBe('typo')
    expect(classifyAnswer('cot', 'cat')).toBe('typo')
    expect(classifyAnswer('dog', 'cat')).toBe('wrong') // dist 3 > 1

    // Long word (> 4 chars): max dist 2
    expect(classifyAnswer('polution', 'pollution')).toBe('typo') // dist 1
    expect(classifyAnswer('pollusion', 'pollution')).toBe('typo') // dist 2
    expect(classifyAnswer('environmetn', 'environment')).toBe('typo') // dist 2
    expect(classifyAnswer('entirelydifferent', 'environment')).toBe('wrong')
  })

  it('classifies unrelated mistakes as wrong', () => {
    expect(classifyAnswer('spaceship', 'environment')).toBe('wrong')
    expect(classifyAnswer('xyzabc', 'cat')).toBe('wrong')
  })
})
