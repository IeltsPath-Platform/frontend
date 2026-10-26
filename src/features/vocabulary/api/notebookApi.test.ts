import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notebookApi } from './notebookApi'
import * as httpClient from '@/lib/httpClient'

vi.mock('@/lib/httpClient', () => ({
  apiRequest: vi.fn(),
}))

describe('notebookApi client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls getCatalogVocabulary without auth header', async () => {
    vi.mocked(httpClient.apiRequest).mockResolvedValueOnce({
      items: [],
      page: 0,
      size: 20,
      total: 0,
    })

    await notebookApi.getCatalogVocabulary({ q: 'resilient', page: 1, size: 10 })

    expect(httpClient.apiRequest).toHaveBeenCalledWith(
      '/api/content/vocabulary?q=resilient&page=1&size=10',
      { auth: false, signal: undefined }
    )
  })

  it('calls getVocabularyItem by id with auth false', async () => {
    vi.mocked(httpClient.apiRequest).mockResolvedValueOnce({
      id: 'uuid-123',
      lemma: 'conserve',
      senses: [],
    })

    await notebookApi.getVocabularyItem('uuid-123')

    expect(httpClient.apiRequest).toHaveBeenCalledWith(
      '/api/content/vocabulary/uuid-123',
      { auth: false, signal: undefined }
    )
  })

  it('calls saveNotebookEntry with correct body and auth', async () => {
    vi.mocked(httpClient.apiRequest).mockResolvedValueOnce({ flashcardId: 'card-1' })

    await notebookApi.saveNotebookEntry('sense-123')

    expect(httpClient.apiRequest).toHaveBeenCalledWith(
      '/api/learning-support/flashcards/notebook/entries',
      {
        method: 'POST',
        auth: true,
        body: { vocabularySenseId: 'sense-123' },
      }
    )
  })

  it('calls getNotebookEntries with query params and repeatable level', async () => {
    vi.mocked(httpClient.apiRequest).mockResolvedValueOnce({
      items: [],
      page: 0,
      size: 20,
      total: 0,
    })

    await notebookApi.getNotebookEntries({
      q: 'eco',
      level: ['UNKNOWN', 'FAMILIAR'],
      sort: 'RECENT',
      due: true,
      page: 0,
      size: 20,
    })

    expect(httpClient.apiRequest).toHaveBeenCalledWith(
      '/api/learning-support/flashcards/notebook/entries?q=eco&level=UNKNOWN&level=FAMILIAR&due=true&sort=RECENT&page=0&size=20',
      { auth: true, signal: undefined }
    )
  })

  it('calls setNotebookEntryLevel with level and requestId', async () => {
    vi.mocked(httpClient.apiRequest).mockResolvedValueOnce(undefined)

    await notebookApi.setNotebookEntryLevel('card-1', 'MASTERED', 'fixed-req-id')

    expect(httpClient.apiRequest).toHaveBeenCalledWith(
      '/api/learning-support/flashcards/notebook/entries/card-1/level',
      {
        method: 'PUT',
        auth: true,
        body: { level: 'MASTERED', requestId: 'fixed-req-id' },
      }
    )
  })

  it('calls getSavedNotebookSenses with comma-separated IDs', async () => {
    vi.mocked(httpClient.apiRequest).mockResolvedValueOnce(['s1', 's2'])

    await notebookApi.getSavedNotebookSenses(['s1', 's2'])

    expect(httpClient.apiRequest).toHaveBeenCalledWith(
      '/api/learning-support/flashcards/notebook/saved?senseIds=s1%2Cs2',
      { auth: true, signal: undefined }
    )
  })
})

