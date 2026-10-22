import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '@/lib/httpClient'
import { getLessonVocabularySenses, type VocabularySenseCard } from './lessonVocabularyApi'

vi.mock('@/lib/httpClient', () => ({ apiRequest: vi.fn() }))

function card(senseId: string): VocabularySenseCard {
  return {
    senseId, vocabularyItemId: `item-${senseId}`, lemma: senseId, ipa: null,
    pronunciationAudioReference: null, partOfSpeech: 'NOUN', englishDefinition: null,
    vietnameseMeaning: null, exampleSentence: null, imageUrl: null,
  }
}

beforeEach(() => { vi.mocked(apiRequest).mockReset() })

describe('lesson vocabulary Library requests', () => {
  it('does not request Library when the lesson has no vocabulary IDs', async () => {
    await expect(getLessonVocabularySenses([])).resolves.toEqual([])
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('deduplicates IDs, authenticates batches of at most 100, and restores lesson order', async () => {
    const ids = Array.from({ length: 203 }, (_, index) => `sense-${index}`)
    const signal = new AbortController().signal
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      const batch = new URL(path, 'https://example.test').searchParams.get('ids')!.split(',')
      return batch.filter((id) => id !== 'sense-1').reverse().map(card)
    })

    const result = await getLessonVocabularySenses([...ids, ids[0], ids[150]], signal)

    expect(apiRequest).toHaveBeenCalledTimes(3)
    const requested = vi.mocked(apiRequest).mock.calls.map(([path, options]) => {
      expect(path).toMatch(/^\/api\/content\/vocabulary\/senses\?/)
      expect(options).toEqual({ auth: true, signal })
      return new URL(path, 'https://example.test').searchParams.get('ids')!.split(',')
    })
    expect(requested.map((batch) => batch.length)).toEqual([100, 100, 3])
    expect(requested.flat()).toEqual(ids)
    expect(result.map((sense) => sense.senseId)).toEqual(ids.filter((id) => id !== 'sense-1'))
  })

  it('rejects a failed batch so callers can offer a retry', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error('Library unavailable'))
    await expect(getLessonVocabularySenses(['sense-1'])).rejects.toThrow('Library unavailable')
  })
})
