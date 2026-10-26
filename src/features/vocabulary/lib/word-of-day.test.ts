import { describe, expect, it } from 'vitest'
import { getDailyDateKey, selectWordOfTheDay } from './word-of-day'
import type { NotebookEntryResponse } from '../api/notebookApi'

function mockEntry(id: string, lemma: string, level: NotebookEntryResponse['level']): NotebookEntryResponse {
  return {
    flashcardId: id,
    vocabularySenseId: `sense-${id}`,
    vocabularyItemId: `item-${id}`,
    lemma,
    ipa: '/test/',
    pronunciationAudioReference: null,
    partOfSpeech: 'NOUN',
    vietnameseMeaning: `nghĩa ${lemma}`,
    englishDefinition: `definition ${lemma}`,
    exampleSentence: `Example for ${lemma}.`,
    imageUrl: null,
    level,
    leitnerBox: level === 'MASTERED' ? 4 : 1,
    reviewCount: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    createdAt: new Date().toISOString(),
    note: null,
  }
}

describe('word of the day selection', () => {
  it('returns null for empty entries', () => {
    expect(selectWordOfTheDay([])).toBeNull()
  })

  it('is deterministic for the same date', () => {
    const entries = [
      mockEntry('1', 'resilient', 'UNKNOWN'),
      mockEntry('2', 'ubiquitous', 'FAMILIAR'),
      mockEntry('3', 'ephemeral', 'LEARNING'),
    ]

    const dateA = new Date('2026-10-26T08:00:00Z')
    const dateB = new Date('2026-10-26T22:30:00Z') // Same calendar day

    const chosenA = selectWordOfTheDay(entries, dateA)
    const chosenB = selectWordOfTheDay(entries, dateB)

    expect(chosenA).not.toBeNull()
    expect(chosenA?.lemma).toBe(chosenB?.lemma)
  })

  it('prioritizes non-mastered words over mastered words', () => {
    const entries = [
      mockEntry('1', 'easy', 'MASTERED'),
      mockEntry('2', 'simple', 'MASTERED'),
      mockEntry('3', 'challenge', 'UNKNOWN'),
    ]

    const chosen = selectWordOfTheDay(entries, new Date('2026-10-26'))
    expect(chosen?.lemma).toBe('challenge')
  })

  it('formats date key properly', () => {
    expect(getDailyDateKey(new Date('2026-10-05T00:00:00Z'))).toBe('2026-10-05')
  })
})
