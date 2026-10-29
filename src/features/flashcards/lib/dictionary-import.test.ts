import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { notebookApi } from '@/features/vocabulary/api/notebookApi'
import { flashcardApi } from '../api/flashcardApi'
import { importSensesToDeck, loadTopicSenses, pickTopicSense } from './dictionary-import'

vi.mock('@/features/vocabulary/api/notebookApi', () => ({
  notebookApi: { saveNotebookEntry: vi.fn(), getCatalogVocabulary: vi.fn() },
}))
vi.mock('../api/flashcardApi', async (original) => ({
  ...(await original<typeof import('../api/flashcardApi')>()),
  flashcardApi: { addToDeck: vi.fn() },
}))

const sense = (id: string, topicId: string | null = null) => ({
  id, vietnameseMeaning: `nghĩa ${id}`, englishDefinition: null, exampleSentence: null, topicId,
})
const item = (id: string, senses: ReturnType<typeof sense>[]) => ({ id, lemma: id, ipa: null, pronunciationAudioReference: null, senses })

describe('pickTopicSense', () => {
  it('prefers the meaning that belongs to the topic', () => {
    expect(pickTopicSense(item('bank', [sense('s1', 'money'), sense('s2', 'nature')]), 'nature')?.senseId).toBe('s2')
  })

  it('falls back to the first meaning and skips words without one', () => {
    expect(pickTopicSense(item('bank', [sense('s1'), sense('s2')]), 'other')?.senseId).toBe('s1')
    expect(pickTopicSense(item('empty', []), null)).toBeNull()
  })
})

describe('loadTopicSenses', () => {
  it('reads every page of the topic', async () => {
    vi.mocked(notebookApi.getCatalogVocabulary)
      .mockResolvedValueOnce({ items: Array.from({ length: 50 }, (_, i) => item(`w${i}`, [sense(`s${i}`, 't')])), page: 0, size: 50, total: 52 })
      .mockResolvedValueOnce({ items: [item('w50', [sense('s50', 't')]), item('w51', [sense('s51', 't')])], page: 1, size: 50, total: 52 })

    const senses = await loadTopicSenses('t')

    expect(senses).toHaveLength(52)
    expect(notebookApi.getCatalogVocabulary).toHaveBeenCalledTimes(2)
  })
})

describe('importSensesToDeck', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reuses the notebook card of each meaning and links it to the deck', async () => {
    vi.mocked(notebookApi.saveNotebookEntry).mockImplementation(async (senseId) => ({ flashcardId: `card-${senseId}` }) as never)
    vi.mocked(flashcardApi.addToDeck).mockResolvedValue(undefined)
    const progress = vi.fn()

    const outcome = await importSensesToDeck('deck', [
      { senseId: 'a', lemma: 'a', meaning: '' },
      { senseId: 'b', lemma: 'b', meaning: '' },
    ], progress)

    expect(outcome).toEqual({ added: 2, failed: [] })
    expect(flashcardApi.addToDeck).toHaveBeenCalledWith('deck', 'card-a')
    expect(flashcardApi.addToDeck).toHaveBeenCalledWith('deck', 'card-b')
    expect(progress).toHaveBeenLastCalledWith(2)
  })

  it('counts a card already in the deck as added and reports real failures', async () => {
    vi.mocked(notebookApi.saveNotebookEntry).mockImplementation(async (senseId) => {
      if (senseId === 'bad') throw new HttpError(404, 'NOT_FOUND')
      return { flashcardId: `card-${senseId}` } as never
    })
    vi.mocked(flashcardApi.addToDeck).mockRejectedValue(new HttpError(409, 'CONFLICT'))

    const outcome = await importSensesToDeck('deck', [
      { senseId: 'dup', lemma: 'dup', meaning: '' },
      { senseId: 'bad', lemma: 'bad', meaning: '' },
    ])

    expect(outcome.added).toBe(1)
    expect(outcome.failed.map((s) => s.senseId)).toEqual(['bad'])
  })
})
