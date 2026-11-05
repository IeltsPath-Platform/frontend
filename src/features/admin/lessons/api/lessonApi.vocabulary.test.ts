import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { addVocabularySense, createVocabularyItem } from './lessonApi'

const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 201, headers: { 'Content-Type': 'application/json' } })
const sense = { partOfSpeech: 'NOUN', englishDefinition: null, vietnameseMeaning: 'ngữ pháp', exampleSentence: 'Grammar matters.', imageUrl: null }

describe('vocabulary creation helpers', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('test-access-token')
  })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('returns the meanings a switched-on word already had', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 'item-1', senses: [{ id: 'old-1' }, { id: 'old-2' }] }))

    await expect(createVocabularyItem({ lemma: 'grammar', ipa: null, ipaUs: null, audioUsReference: null, audioUkReference: null }))
      .resolves.toEqual({ id: 'item-1', senseIds: ['old-1', 'old-2'] })
  })

  it('finds the new meaning by id, wherever the server lists it, and places it after the known ones', async () => {
    // Senses come back ordered by sortOrder, so the new one is not necessarily last.
    fetchMock.mockResolvedValueOnce(json({ id: 'item-1', senses: [{ id: 'old-1' }, { id: 'new' }, { id: 'old-2' }] }))

    await expect(addVocabularySense('item-1', sense, ['old-1', 'old-2'])).resolves.toBe('new')
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))
    expect(body.sortOrder).toBe(2)
  })

  it('fails rather than guessing when no new meaning comes back', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 'item-1', senses: [{ id: 'old-1' }] }))

    await expect(addVocabularySense('item-1', sense, ['old-1'])).rejects.toThrow('Máy chủ không trả về nghĩa vừa thêm.')
  })
})
