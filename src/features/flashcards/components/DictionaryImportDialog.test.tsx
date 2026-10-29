import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notebookApi } from '@/features/vocabulary/api/notebookApi'
import { flashcardApi } from '../api/flashcardApi'
import { DictionaryImportDialog } from './DictionaryImportDialog'

vi.mock('@/features/vocabulary/api/notebookApi', () => ({
  notebookApi: { getTopics: vi.fn(), getCatalogVocabulary: vi.fn(), saveNotebookEntry: vi.fn() },
}))
vi.mock('../api/flashcardApi', async (original) => ({
  ...(await original<typeof import('../api/flashcardApi')>()),
  flashcardApi: { listDecks: vi.fn(), createDeck: vi.fn(), addToDeck: vi.fn() },
}))

const word = (id: string, lemma: string, meaning: string) => ({
  id, lemma, ipa: null, pronunciationAudioReference: null,
  senses: [{ id: `s-${id}`, vietnameseMeaning: meaning, englishDefinition: null, exampleSentence: null, topicId: 'env' }],
})

describe('DictionaryImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(flashcardApi.listDecks).mockResolvedValue({ items: [], page: 0, size: 100, total: 0 })
    vi.mocked(notebookApi.getTopics).mockResolvedValue([
      { id: 'env', slug: 'environment', name: 'Environment', nameVi: 'Môi trường', coverKey: null, coverUrl: null, sortOrder: 1, wordCount: 2 },
    ])
    vi.mocked(notebookApi.getCatalogVocabulary).mockResolvedValue({
      items: [word('1', 'habitat', 'môi trường sống'), word('2', 'pollution', 'ô nhiễm')], page: 0, size: 50, total: 2,
    })
    vi.mocked(notebookApi.saveNotebookEntry).mockImplementation(async (senseId) => ({ flashcardId: `card-${senseId}` }) as never)
    vi.mocked(flashcardApi.createDeck).mockResolvedValue({ id: 'deck-new' } as never)
    vi.mocked(flashcardApi.addToDeck).mockResolvedValue(undefined)
  })

  it('imports a whole topic into a new deck named after it', async () => {
    const onImported = vi.fn()
    render(<DictionaryImportDialog onClose={vi.fn()} onImported={onImported} />)

    await userEvent.click(await screen.findByRole('button', { name: /Môi trường/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Chọn tất cả 2' }))
    expect(screen.getByRole('textbox', { name: /Tên học phần mới/i })).toHaveValue('Môi trường')
    await userEvent.click(screen.getByRole('button', { name: /Thêm 2 thẻ/ }))

    await waitFor(() => expect(onImported).toHaveBeenCalledWith('deck-new', 2, 0))
    expect(flashcardApi.createDeck).toHaveBeenCalledWith(expect.objectContaining({ name: 'Môi trường' }))
    expect(flashcardApi.addToDeck).toHaveBeenCalledWith('deck-new', 'card-s-1')
    expect(flashcardApi.addToDeck).toHaveBeenCalledWith('deck-new', 'card-s-2')
  })

  it('adds single words found by search to a fixed deck', async () => {
    const onImported = vi.fn()
    render(<DictionaryImportDialog deckId="deck-1" initialTab="words" onClose={vi.fn()} onImported={onImported} />)

    await userEvent.type(screen.getByRole('textbox', { name: /Tìm từ trong từ điển/i }), 'habitat')
    await userEvent.click(await screen.findByRole('button', { name: 'Chọn habitat' }))
    await userEvent.click(screen.getByRole('button', { name: /Thêm 1 thẻ/ }))

    await waitFor(() => expect(onImported).toHaveBeenCalledWith('deck-1', 1, 0))
    expect(flashcardApi.createDeck).not.toHaveBeenCalled()
    expect(flashcardApi.addToDeck).toHaveBeenCalledWith('deck-1', 'card-s-1')
  })
})
