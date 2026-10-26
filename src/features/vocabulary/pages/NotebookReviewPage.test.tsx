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
})

