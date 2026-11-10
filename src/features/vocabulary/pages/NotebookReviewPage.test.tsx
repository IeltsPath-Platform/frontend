import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotebookReviewPage } from './NotebookReviewPage'
import { notebookApi } from '../api/notebookApi'

vi.mock('../api/notebookApi', () => ({
  notebookApi: {
    getDueFlashcards: vi.fn(),
    getNotebookEntries: vi.fn(),
    reviewFlashcard: vi.fn(),
  },
}))

const MOCK_DUE_ITEMS = [
  {
    id: 'fc-1',
    userId: 'u1',
    sourceType: 'VOCABULARY_SENSE',
    vocabularySenseId: 's1',
    front: 'lucid',
    back: 'rõ ràng, minh bạch',
    leitnerBox: 1,
    nextReviewAt: '2026-10-26T00:00:00Z',
    exampleSentence: 'A lucid explanation was provided.',
    imageUrl: null,
    ipa: '/ˈluː.sɪd/',
    pronunciationAudioReference: null,
  },
]

describe('NotebookReviewPage', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    vi.clearAllMocks()
    vi.mocked(notebookApi.getDueFlashcards).mockResolvedValue({
      items: MOCK_DUE_ITEMS,
      page: 0,
      size: 50,
      total: 1,
    })
    vi.mocked(notebookApi.reviewFlashcard).mockResolvedValue({})
  })

  it('renders review card and handles user answer review flow', async () => {
    render(
      <MemoryRouter initialEntries={['/vocabulary/notebook/review?mode=flashcard']}>
        <Routes>
          <Route path="/vocabulary/notebook/review" element={<NotebookReviewPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('lucid')).toBeInTheDocument()
    })

    // Click front of card to flip
    const flipButton = screen.getByRole('button', { name: /Mặt trước thẻ/i })
    await userEvent.click(flipButton)

    await waitFor(() => {
      expect(screen.getByText('rõ ràng, minh bạch')).toBeInTheDocument()
    })

    // Click Remembered (Nhớ)
    const rememberButton = screen.getByRole('button', { name: /Đã nhớ/i })
    await userEvent.click(rememberButton)

    await waitFor(() => {
      expect(notebookApi.reviewFlashcard).toHaveBeenCalledWith(
        'fc-1',
        true,
        expect.any(String),
        expect.any(String)
      )
      // Check summary screen is displayed
      expect(screen.getByRole('heading', { level: 2, name: /Hoàn thành phiên ôn tập!/i })).toBeInTheDocument()
    })
  })

  it('loads only previously learned due notebook entries from the overview action', async () => {
    vi.mocked(notebookApi.getNotebookEntries).mockResolvedValue({
      items: [{
        flashcardId: 'fc-1', vocabularySenseId: 's1', vocabularyItemId: 'v1', lemma: 'lucid',
        ipa: null, pronunciationAudioReference: null, partOfSpeech: null,
        vietnameseMeaning: 'rõ ràng', englishDefinition: null, exampleSentence: 'A lucid explanation.',
        imageUrl: null, level: 'UNKNOWN', leitnerBox: 1, reviewCount: 2,
        lastReviewedAt: '2026-11-01T00:00:00Z', nextReviewAt: '2026-11-07T00:00:00Z',
        createdAt: '2026-11-01T00:00:00Z', note: null,
      }],
      total: 1, page: 0, size: 50,
    })
    render(
      <MemoryRouter initialEntries={['/vocabulary/notebook/review?review=due&mode=flashcard']}>
        <Routes><Route path="/vocabulary/notebook/review" element={<NotebookReviewPage />} /></Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('lucid')).toBeInTheDocument()
    expect(notebookApi.getNotebookEntries).toHaveBeenCalledWith(
      { due: true, learned: true, sort: 'DUE', size: 50 }, expect.any(AbortSignal),
    )
    expect(notebookApi.getDueFlashcards).not.toHaveBeenCalled()
  })

  it('keeps an empty scheduled-review queue empty instead of falling back to recent cards', async () => {
    vi.mocked(notebookApi.getNotebookEntries).mockResolvedValue({ items: [], total: 0, page: 0, size: 50 })
    render(
      <MemoryRouter initialEntries={['/vocabulary/notebook/review?review=due']}>
        <Routes><Route path="/vocabulary/notebook/review" element={<NotebookReviewPage />} /></Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/không còn từ vựng nào cần ôn gấp/i)).toBeInTheDocument()
    expect(notebookApi.getNotebookEntries).toHaveBeenCalledTimes(1)
    expect(notebookApi.getDueFlashcards).not.toHaveBeenCalled()
  })
})

