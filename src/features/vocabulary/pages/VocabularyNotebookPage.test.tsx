import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VocabularyNotebookPage } from './VocabularyNotebookPage'
import { notebookApi } from '../api/notebookApi'
import { ToastProvider } from '@/components/toast/ToastProvider'

vi.mock('../api/notebookApi', () => ({
  notebookApi: {
    getNotebookSummary: vi.fn(),
    getNotebookEntries: vi.fn(),
    setNotebookEntryLevel: vi.fn(),
    deleteNotebookEntry: vi.fn(),
    saveNotebookEntry: vi.fn(),
    searchVocabulary: vi.fn(),
  },
}))

const MOCK_SUMMARY = {
  total: 15,
  byLevel: {
    UNKNOWN: 2,
    FAMILIAR: 5,
    LEARNING: 5,
    MASTERED: 3,
  },
  dueNow: 4,
  addedLast7Days: 6,
  reviewedToday: 10,
  nextDueAt: '2026-10-27T08:00:00Z',
}

const MOCK_ENTRIES = [
  {
    flashcardId: 'fc-101',
    vocabularySenseId: 's-101',
    vocabularyItemId: 'w-101',
    lemma: 'ubiquitous',
    ipa: '/juːˈbɪk.wɪ.təs/',
    pronunciationAudioReference: null,
    partOfSpeech: 'adjective',
    vietnameseMeaning: 'phổ biến khắp nơi',
    englishDefinition: 'present, appearing, or found everywhere',
    exampleSentence: 'Mobile phones are ubiquitous today.',
    imageUrl: null,
    level: 'FAMILIAR' as const,
    leitnerBox: 2,
    reviewCount: 4,
    lastReviewedAt: '2026-10-25T10:00:00Z',
    nextReviewAt: '2026-10-27T10:00:00Z',
    createdAt: '2026-10-20T10:00:00Z',
    note: null,
  },
  {
    flashcardId: 'fc-102',
    vocabularySenseId: 's-102',
    vocabularyItemId: 'w-102',
    lemma: 'mitigate',
    ipa: '/ˈmɪt.ɪ.ɡeɪt/',
    pronunciationAudioReference: null,
    partOfSpeech: 'verb',
    vietnameseMeaning: 'giảm nhẹ, làm dịu bớt',
    englishDefinition: 'make less severe, serious, or painful',
    exampleSentence: 'Measures to mitigate climate risks.',
    imageUrl: null,
    level: 'LEARNING' as const,
    leitnerBox: 3,
    reviewCount: 6,
    lastReviewedAt: '2026-10-24T10:00:00Z',
    nextReviewAt: '2026-10-26T08:00:00Z',
    createdAt: '2026-10-18T10:00:00Z',
    note: 'Thường đi với risks, impacts.',
  },
]

describe('VocabularyNotebookPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    vi.mocked(notebookApi.getNotebookSummary).mockResolvedValue(MOCK_SUMMARY)
    vi.mocked(notebookApi.getNotebookEntries).mockResolvedValue({
      items: MOCK_ENTRIES,
      page: 0,
      size: 24,
      total: 2,
    })
  })

  it('renders hero summary, word cards, and supports opening word detail drawer', async () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/vocabulary/notebook']}>
          <VocabularyNotebookPage />
        </MemoryRouter>
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Sổ tay từ vựng của bạn/i })).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 3, name: /ubiquitous/i }).length).toBeGreaterThan(0)
      expect(screen.getAllByRole('heading', { level: 3, name: /mitigate/i }).length).toBeGreaterThan(0)
    })

    // Click on a word card heading to open detail drawer
    const cardHeading = screen.getAllByRole('heading', { level: 3, name: /ubiquitous/i })[0]
    await userEvent.click(cardHeading)

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Chi tiết từ ubiquitous/i })).toBeInTheDocument()
    })
  })
})

