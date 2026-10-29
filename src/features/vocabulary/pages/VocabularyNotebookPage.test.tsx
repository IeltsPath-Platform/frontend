import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VocabularyNotebookPage } from './VocabularyNotebookPage'
import { notebookApi } from '../api/notebookApi'
import { ToastProvider } from '@/components/toast/ToastProvider'

const session = vi.hoisted(() => ({ current: { isLoggedIn: true, hydrated: true, userName: 'Learner', points: 0, tier: 'FREE', email: null, userId: 'u1', roles: [] as string[] } }))

vi.mock('@/features/auth/authSession', () => ({
  useAuthSession: () => session.current,
}))

vi.mock('../api/notebookApi', () => ({
  notebookApi: {
    getNotebookSummary: vi.fn(),
    getNotebookEntries: vi.fn(),
    setNotebookEntryLevel: vi.fn(),
    deleteNotebookEntry: vi.fn(),
    saveNotebookEntry: vi.fn(),
    getCatalogVocabulary: vi.fn(),
    getSavedNotebookSenses: vi.fn(),
    saveSenseNote: vi.fn(),
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

const DICTIONARY_HIT = {
  id: 'w-200',
  lemma: 'make up',
  ipa: null,
  pronunciationAudioReference: null,
  senses: [{ id: 's-200', vietnameseMeaning: 'bịa ra; trang điểm', englishDefinition: null, exampleSentence: null, partOfSpeech: 'phrasal verb' }],
}

function renderNotebook() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/vocabulary/notebook']}>
        <VocabularyNotebookPage />
      </MemoryRouter>
    </ToastProvider>
  )
}

describe('VocabularyNotebookPage', () => {
  beforeEach(() => {
    session.current = { isLoggedIn: true, hydrated: true, userName: 'Learner', points: 0, tier: 'FREE', email: null, userId: 'u1', roles: [] }
    vi.clearAllMocks()
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    vi.mocked(notebookApi.getNotebookSummary).mockResolvedValue(MOCK_SUMMARY)
    vi.mocked(notebookApi.getCatalogVocabulary).mockResolvedValue({ items: [DICTIONARY_HIT], page: 0, size: 8, total: 1 })
    vi.mocked(notebookApi.getSavedNotebookSenses).mockResolvedValue([])
    vi.mocked(notebookApi.saveNotebookEntry).mockResolvedValue(MOCK_ENTRIES[0])
    vi.mocked(notebookApi.getNotebookEntries).mockResolvedValue({
      items: MOCK_ENTRIES,
      page: 0,
      size: 24,
      total: 2,
    })
  })

  it('renders hero summary and word cards, and opens a word in a popup', async () => {
    renderNotebook()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Sổ tay từ vựng của bạn/i })).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 3, name: /ubiquitous/i }).length).toBeGreaterThan(0)
      expect(screen.getAllByRole('heading', { level: 3, name: /mitigate/i }).length).toBeGreaterThan(0)
    })
    expect(screen.queryByText(/Từ của ngày/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('heading', { level: 3, name: /ubiquitous/i })[0])

    const dialog = await screen.findByRole('dialog', { name: /Chi tiết từ ubiquitous/i })
    expect(dialog).toHaveTextContent('phổ biến khắp nơi')
    await userEvent.click(screen.getByRole('button', { name: 'Từ tiếp theo' }))
    expect(await screen.findByRole('dialog', { name: /Chi tiết từ mitigate/i })).toBeInTheDocument()
  })

  it('keeps spaces while typing and searches the notebook after a pause', async () => {
    renderNotebook()
    const box = await screen.findByRole('textbox', { name: /Tìm kiếm trong sổ từ vựng/i })

    await userEvent.type(box, 'make up')

    expect(box).toHaveValue('make up')
    await waitFor(() => expect(notebookApi.getNotebookEntries).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'make up' }), expect.anything()))
  })

  it('suggests dictionary words that are not in the notebook yet and saves one', async () => {
    renderNotebook()
    const box = await screen.findByRole('textbox', { name: /Tìm kiếm trong sổ từ vựng/i })

    await userEvent.type(box, 'make up')

    const suggestions = await screen.findByRole('region', { name: /Gợi ý từ từ điển/i }, { timeout: 4000 })
    await userEvent.click(within(suggestions).getByRole('button', { name: /Thêm make up vào sổ tay/i }))
    expect(notebookApi.saveNotebookEntry).toHaveBeenCalledWith('s-200')
  })

  it('adds a word from the quick add box', async () => {
    renderNotebook()

    await userEvent.type(await screen.findByRole('textbox', { name: /Tìm từ để thêm vào sổ tay/i }), 'make')
    const quick = screen.getByRole('region', { name: /Thêm từ nhanh/i })
    await userEvent.click(await within(quick).findByRole('button', { name: /Thêm make up vào sổ tay/i }, { timeout: 4000 }))

    expect(notebookApi.saveNotebookEntry).toHaveBeenCalledWith('s-200')
  })
})

