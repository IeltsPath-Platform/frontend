import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VocabularyNotebookPage } from './VocabularyNotebookPage'
import { notebookApi } from '../api/notebookApi'
import { flashcardApi } from '@/features/flashcards/api/flashcardApi'
import { ToastProvider } from '@/components/toast/ToastProvider'

const session = vi.hoisted(() => ({
  current: {
    isLoggedIn: true,
    hydrated: true,
    userName: 'Learner',
    points: 0,
    tier: 'FREE',
    email: null,
    userId: 'u1',
    roles: [] as string[],
  },
}))

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

vi.mock('@/features/flashcards/api/flashcardApi', () => ({
  flashcardApi: {
    dueCards: vi.fn(),
    listDecks: vi.fn(),
    listCards: vi.fn(),
    deleteDeck: vi.fn(),
    deleteCard: vi.fn(),
  },
  flashcardErrorMessage: (e: unknown) => String(e),
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

const MOCK_FLASHCARDS = [
  {
    id: 'fc-dict',
    sourceType: 'VOCABULARY_SENSE' as const,
    vocabularySenseId: 's-101',
    sourceReferenceId: null,
    highlightedText: null,
    front: 'ubiquitous',
    back: 'phổ biến khắp nơi',
    status: 'ACTIVE' as const,
    createdAt: '2026-10-20T00:00:00Z',
    updatedAt: '2026-10-20T00:00:00Z',
    leitnerBox: 2,
    nextReviewAt: null,
    lastReviewedAt: null,
    reviewCount: 3,
    ipa: '/juːˈbɪk.wɪ.təs/',
    pronunciationAudioReference: null,
    exampleSentence: 'Smartphones are ubiquitous.',
  },
  {
    id: 'fc-manual',
    sourceType: 'MANUAL' as const,
    vocabularySenseId: null,
    sourceReferenceId: null,
    highlightedText: null,
    front: 'procrastination',
    back: 'sự trì hoãn',
    status: 'ACTIVE' as const,
    createdAt: '2026-10-20T00:00:00Z',
    updatedAt: '2026-10-20T00:00:00Z',
    leitnerBox: 1,
    nextReviewAt: null,
    lastReviewedAt: null,
    reviewCount: 1,
    ipa: null,
    pronunciationAudioReference: null,
    exampleSentence: null,
  },
]

const MOCK_DECKS = [
  {
    id: 'd-1',
    name: 'IELTS Academic Vocab',
    description: 'Chủ đề môi trường',
    status: 'ACTIVE' as const,
    createdAt: '2026-10-20T00:00:00Z',
    updatedAt: '2026-10-20T00:00:00Z',
    cardCount: 12,
    dueCount: 2,
  },
]

const DICTIONARY_HIT = {
  id: 'w-200',
  lemma: 'make up',
  ipa: null,
  pronunciationAudioReference: null,
  senses: [
    {
      id: 's-200',
      vietnameseMeaning: 'bịa ra; trang điểm',
      englishDefinition: null,
      exampleSentence: null,
      partOfSpeech: 'phrasal verb',
    },
  ],
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-probe">{location.pathname + location.search}</div>
}

function renderNotebook(initialEntry = '/vocabulary/notebook') {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/vocabulary/notebook"
            element={
              <>
                <VocabularyNotebookPage />
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/flashcards"
            element={<Navigate replace to="/vocabulary/notebook?tab=decks" />}
          />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
}

describe('VocabularyNotebookPage', () => {
  beforeEach(() => {
    session.current = {
      isLoggedIn: true,
      hydrated: true,
      userName: 'Learner',
      points: 0,
      tier: 'FREE',
      email: null,
      userId: 'u1',
      roles: [],
    }
    vi.clearAllMocks()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.mocked(notebookApi.getNotebookSummary).mockResolvedValue(MOCK_SUMMARY)
    vi.mocked(notebookApi.getCatalogVocabulary).mockResolvedValue({
      items: [DICTIONARY_HIT],
      page: 0,
      size: 8,
      total: 1,
    })
    vi.mocked(notebookApi.getSavedNotebookSenses).mockResolvedValue([])
    vi.mocked(notebookApi.saveNotebookEntry).mockResolvedValue(MOCK_ENTRIES[0])
    vi.mocked(notebookApi.getNotebookEntries).mockResolvedValue({
      items: MOCK_ENTRIES,
      page: 0,
      size: 24,
      total: 2,
    })
    vi.mocked(flashcardApi.dueCards).mockResolvedValue({
      total: 4,
      items: [],
      page: 0,
      size: 1,
    })
    vi.mocked(flashcardApi.listDecks).mockResolvedValue({
      total: 1,
      items: MOCK_DECKS,
      page: 0,
      size: 50,
    })
    vi.mocked(flashcardApi.listCards).mockResolvedValue({
      total: 2,
      items: MOCK_FLASHCARDS,
      page: 0,
      size: 50,
    })
  })

  it('renders hero summary and word cards, and opens a word in a popup', async () => {
    renderNotebook()

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Sổ tay từ vựng của bạn/i }),
      ).toBeInTheDocument()
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
    await waitFor(() =>
      expect(notebookApi.getNotebookEntries).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'make up' }),
        expect.anything(),
      ),
    )
  })

  it('suggests dictionary words that are not in the notebook yet and saves one', async () => {
    renderNotebook()
    const box = await screen.findByRole('textbox', { name: /Tìm kiếm trong sổ từ vựng/i })

    await userEvent.type(box, 'make up')

    const suggestions = await screen.findByRole(
      'region',
      { name: /Gợi ý từ từ điển/i },
      { timeout: 4000 },
    )
    await userEvent.click(
      within(suggestions).getByRole('button', { name: /Thêm make up vào sổ tay/i }),
    )
    expect(notebookApi.saveNotebookEntry).toHaveBeenCalledWith('s-200')
  })

  it('adds a word from the quick add box', async () => {
    renderNotebook()

    await userEvent.type(
      await screen.findByRole('textbox', { name: /Tìm từ để thêm vào sổ tay/i }),
      'make',
    )
    const quick = screen.getByRole('region', { name: /Thêm từ nhanh/i })
    await userEvent.click(
      await within(quick).findByRole(
        'button',
        { name: /Thêm make up vào sổ tay/i },
        { timeout: 4000 },
      ),
    )

    expect(notebookApi.saveNotebookEntry).toHaveBeenCalledWith('s-200')
  })

  // 1. Switching tabs updates URL
  it('updates the URL when switching between tabs', async () => {
    renderNotebook()

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Từ vựng/i })).toHaveAttribute('aria-selected', 'true')
    })

    // Click Decks tab
    await userEvent.click(screen.getByRole('tab', { name: /Bộ thẻ/i }))
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/vocabulary/notebook?tab=decks')
    expect(screen.getByRole('tab', { name: /Bộ thẻ/i })).toHaveAttribute('aria-selected', 'true')

    // Click Cards tab
    await userEvent.click(screen.getByRole('tab', { name: /Tất cả thẻ/i }))
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/vocabulary/notebook?tab=cards')
    expect(screen.getByRole('tab', { name: /Tất cả thẻ/i })).toHaveAttribute('aria-selected', 'true')

    // Click Words tab again
    await userEvent.click(screen.getByRole('tab', { name: /Từ vựng/i }))
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/vocabulary/notebook')
    expect(screen.getByRole('tab', { name: /Từ vựng/i })).toHaveAttribute('aria-selected', 'true')
  })

  // 2. ?tab=xyz defaults to words tab
  it('defaults to words tab when ?tab=xyz is invalid', async () => {
    renderNotebook('/vocabulary/notebook?tab=invalidTab')

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Từ vựng/i })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: /Bộ thẻ/i })).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('tab', { name: /Tất cả thẻ/i })).toHaveAttribute('aria-selected', 'false')
      expect(document.getElementById('nb-panel-words')).toBeInTheDocument()
    })
  })

  // 3. /flashcards redirects to /vocabulary/notebook?tab=decks
  it('redirects from /flashcards to /vocabulary/notebook?tab=decks', async () => {
    renderNotebook('/flashcards')

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/vocabulary/notebook?tab=decks')
      expect(screen.getByRole('tab', { name: /Bộ thẻ/i })).toHaveAttribute('aria-selected', 'true')
    })
  })

  // 4. "Ôn ngay (N)" button displays N and is disabled when N = 0
  it('displays due count in primary review button and disables it when N = 0', async () => {
    // With 4 due cards
    renderNotebook()
    const studyBtn = await screen.findByRole('button', { name: /Ôn ngay \(4\)/i })
    expect(studyBtn).toBeInTheDocument()
    expect(studyBtn).not.toBeDisabled()
  })

  it('disables the review button when there are 0 due cards', async () => {
    vi.mocked(flashcardApi.dueCards).mockResolvedValue({
      total: 0,
      items: [],
      page: 0,
      size: 1,
    })
    renderNotebook()

    const studyBtn = await screen.findByRole('button', { name: /Ôn ngay \(0\)/i })
    expect(studyBtn).toBeInTheDocument()
    expect(studyBtn).toBeDisabled()
  })

  // 5. Guest sees login invitation on decks tab with correct returnTo
  it('shows login invitation with returnTo on decks tab for guest users', async () => {
    session.current = {
      isLoggedIn: false,
      hydrated: true,
      userName: '',
      points: 0,
      tier: 'FREE',
      email: null,
      userId: '',
      roles: [],
    }
    renderNotebook('/vocabulary/notebook?tab=decks')

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Bộ thẻ Flashcard của bạn/i }),
      ).toBeInTheDocument()
    })

    const loginLink = screen.getByRole('link', { name: /Đăng nhập ngay/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink.getAttribute('href')).toContain('/login?returnTo=')
    expect(decodeURIComponent(loginLink.getAttribute('href')!)).toContain('tab=decks')
  })

  // 6. Source filter on cards tab
  it('filters cards by source on cards tab (Từ điển vs Tự soạn)', async () => {
    renderNotebook('/vocabulary/notebook?tab=cards')

    await waitFor(() => {
      expect(screen.getByText('ubiquitous')).toBeInTheDocument()
      expect(screen.getByText('procrastination')).toBeInTheDocument()
    })

    // Both source badges are present
    expect(document.querySelector('.fc-source-badge--dict')).toHaveTextContent('Từ điển')
    expect(document.querySelector('.fc-source-badge--manual')).toHaveTextContent('Tự soạn')

    // Filter by "Từ điển"
    const dictFilterBtn = screen.getByRole('button', { name: 'Từ điển' })
    await userEvent.click(dictFilterBtn)

    expect(screen.getByText('ubiquitous')).toBeInTheDocument()
    expect(screen.queryByText('procrastination')).not.toBeInTheDocument()

    // Filter by "Tự soạn"
    const manualFilterBtn = screen.getByRole('button', { name: 'Tự soạn' })
    await userEvent.click(manualFilterBtn)

    expect(screen.queryByText('ubiquitous')).not.toBeInTheDocument()
    expect(screen.getByText('procrastination')).toBeInTheDocument()

    // Filter back to "Tất cả"
    const allFilterBtn = screen.getByRole('button', { name: 'Tất cả' })
    await userEvent.click(allFilterBtn)

    expect(screen.getByText('ubiquitous')).toBeInTheDocument()
    expect(screen.getByText('procrastination')).toBeInTheDocument()
  })
})
