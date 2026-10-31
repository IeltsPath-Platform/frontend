import { describe, expect, it } from 'vitest'
import type { WordFilters } from '../types/game'
import {
  availableWords,
  wordFilterError,
  wordFilterLabel,
  wordlyRequiredWords,
} from './wordFilters'

const filters: WordFilters = {
  topics: [{ id: 't1', slug: 'environment', name: 'Environment', nameVi: 'Môi trường' }],
  availability: [
    { cefrLevel: null, topicId: null, words: 900 },
    { cefrLevel: 'B1', topicId: null, words: 150 },
    { cefrLevel: null, topicId: 't1', words: 120 },
    { cefrLevel: 'B1', topicId: 't1', words: 22 },
  ],
}

describe('word filters', () => {
  it('reads every combination with Tất cả', () => {
    expect(availableWords(filters, { cefrLevel: null, topicId: null })).toBe(900)
    expect(availableWords(filters, { cefrLevel: 'B1', topicId: null })).toBe(150)
    expect(availableWords(filters, { cefrLevel: null, topicId: 't1' })).toBe(120)
    expect(availableWords(filters, { cefrLevel: 'B1', topicId: 't1' })).toBe(22)
  })

  it('treats a missing row as no words', () => {
    expect(availableWords(filters, { cefrLevel: 'C2', topicId: 't1' })).toBe(0)
  })

  it('reports a choice with too few words, and nothing before the counts load', () => {
    const choice = { cefrLevel: 'B1', topicId: 't1' }
    expect(wordFilterError(filters, choice, 22)).toBeNull()
    expect(wordFilterError(filters, choice, 23)).toContain('chỉ có 22 từ, cần 23 từ')
    expect(wordFilterError(null, choice, 23)).toBeNull()
  })

  it('needs the word limit, or five words for endless Wordly', () => {
    expect(wordlyRequiredWords(12)).toBe(12)
    expect(wordlyRequiredWords(null)).toBe(5)
  })

  it('names a choice even when the topic list is missing', () => {
    expect(wordFilterLabel({ cefrLevel: 'B1', topicId: 't1' }, filters)).toBe('B1 · Môi trường')
    expect(wordFilterLabel({ cefrLevel: null, topicId: null }, null)).toBe('Mọi trình độ · Mọi chủ đề')
    expect(wordFilterLabel({ cefrLevel: 'B1', topicId: 't1' }, null)).toBe('B1 · Chủ đề đã chọn')
  })
})
