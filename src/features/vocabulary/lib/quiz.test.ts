import { describe, expect, it } from 'vitest'
import {
  buildMultipleChoices,
  createQuizQuestion,
  generateDistractors,
  isLemmaCorrect,
  maskLemmaInSentence,
  normalizeAnswer,
  resolveMixedMode,
} from './quiz'
import type { NotebookEntryResponse } from '../api/notebookApi'

function mockEntry(lemma: string, meaning: string, level: NotebookEntryResponse['level']): NotebookEntryResponse {
  return {
    flashcardId: `card-${lemma}`,
    vocabularySenseId: `sense-${lemma}`,
    vocabularyItemId: `item-${lemma}`,
    lemma,
    ipa: null,
    pronunciationAudioReference: null,
    partOfSpeech: 'NOUN',
    vietnameseMeaning: meaning,
    englishDefinition: `definition ${lemma}`,
    exampleSentence: `This is an example with ${lemma} here.`,
    imageUrl: null,
    level,
    leitnerBox: 1,
    reviewCount: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    createdAt: new Date().toISOString(),
    note: null,
  }
}

describe('quiz utilities', () => {
  it('normalizes answer strings for comparison', () => {
    expect(normalizeAnswer('  Resilient!  ')).toBe('resilient')
    expect(normalizeAnswer('SUSTAINABLE.')).toBe('sustainable')
    expect(normalizeAnswer('bền vững')).toBe('ben vung')
  })

  it('checks lemma correctness ignoring case and punctuation', () => {
    expect(isLemmaCorrect('Resilient', 'resilient')).toBe(true)
    expect(isLemmaCorrect('sustainable ', 'sustainable')).toBe(true)
    expect(isLemmaCorrect('wrong', 'right')).toBe(false)
  })

  it('masks lemma in example sentence properly', () => {
    const masked = maskLemmaInSentence('The town proved resilient after the storm.', 'resilient')
    expect(masked).toBe('The town proved ______ after the storm.')
  })

  it('generates distractors excluding the correct meaning', () => {
    const entries = [
      mockEntry('word1', 'Nghĩa 1', 'UNKNOWN'),
      mockEntry('word2', 'Nghĩa 2', 'FAMILIAR'),
      mockEntry('word3', 'Nghĩa 3', 'LEARNING'),
      mockEntry('word4', 'Nghĩa 4', 'MASTERED'),
    ]
    const distractors = generateDistractors('Nghĩa 1', entries, 3)
    expect(distractors.length).toBe(3)
    expect(distractors).not.toContain('Nghĩa 1')
  })

  it('builds multiple choices with correct answer included', () => {
    const distractors = ['Sai 1', 'Sai 2', 'Sai 3']
    const { choices, correctIndex } = buildMultipleChoices('Đúng', distractors)
    expect(choices.length).toBe(4)
    expect(choices).toContain('Đúng')
    expect(choices[correctIndex]).toBe('Đúng')
  })

  it('resolves mixed mode based on entry level', () => {
    const unknownEntry = mockEntry('new', 'Mới', 'UNKNOWN')
    const masteredEntry = mockEntry('old', 'Cũ', 'MASTERED')

    const unknownMode = resolveMixedMode(unknownEntry)
    expect(['FLASHCARD', 'MEANING_GUESS']).toContain(unknownMode)

    const masteredMode = resolveMixedMode(masteredEntry)
    expect(['TYPING', 'FILL_IN_BLANK', 'DICTATION']).toContain(masteredMode)
  })

  it('creates quiz questions with proper structure', () => {
    const entry = mockEntry('conserve', 'Bảo tồn', 'UNKNOWN')
    const question = createQuizQuestion(entry, 'MEANING_GUESS', [entry])
    expect(question.mode).toBe('MEANING_GUESS')
    expect(question.choices).toBeDefined()
    expect(question.correctChoiceIndex).toBeDefined()
  })
})

