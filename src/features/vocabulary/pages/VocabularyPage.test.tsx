import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VocabularyPage } from './VocabularyPage'
import { notebookApi } from '../api/notebookApi'
import { ToastProvider } from '@/components/toast/ToastProvider'

vi.mock('../api/notebookApi', () => ({
  notebookApi: {
    getCatalogVocabulary: vi.fn(),
    getSavedNotebookSenses: vi.fn(),
    saveNotebookEntry: vi.fn(),
    getSets: vi.fn().mockResolvedValue({ items: [], page: 0, size: 20, total: 0 }),
    getTopics: vi.fn().mockResolvedValue([]),
    getMindmap: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
    getNotebookSummary: vi.fn().mockResolvedValue(null),
    getLearningReport: vi.fn().mockResolvedValue(null),
    getTopicsProgress: vi.fn().mockResolvedValue(null),
    getVocabularyMap: vi.fn().mockResolvedValue(null),
    getWeeklyGoal: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('@/features/auth/authSession', () => ({
  useAuthSession: () => ({ isLoggedIn: false, userName: undefined }),
}))

const MOCK_CATALOG = {
  items: [
    {
      id: 'item-1',
      lemma: 'sustainable',
      ipa: '/səˈsteɪ.nə.bəl/',
      pronunciationAudioReference: null,
      senses: [
        {
          id: 'sense-1',
          vietnameseMeaning: 'bền vững',
          englishDefinition: 'causing little or no damage to the environment',
          exampleSentence: 'We need sustainable energy.',
          partOfSpeech: 'adjective',
        },
      ],
    },
  ],
  page: 0,
  size: 12,
  total: 1,
}

function renderPage(path = '/vocabulary') {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <VocabularyPage />
      </MemoryRouter>
    </ToastProvider>
  )
}

describe('VocabularyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    vi.mocked(notebookApi.getCatalogVocabulary).mockResolvedValue(MOCK_CATALOG)
    vi.mocked(notebookApi.getSavedNotebookSenses).mockResolvedValue([])
  })

  it('does not list the whole dictionary until the learner searches', async () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: /Từ điển/i })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: /Tìm từ tiếng Anh/i })).toBeInTheDocument()
    await waitFor(() => expect(notebookApi.getTopics).toHaveBeenCalled())
    expect(notebookApi.getCatalogVocabulary).not.toHaveBeenCalled()
    expect(screen.queryByText('sustainable', { selector: 'h3 *, h3' })).not.toBeInTheDocument()
  })

  it('searches English words and opens the word page from the whole card', async () => {
    renderPage()

    await userEvent.type(screen.getByRole('searchbox'), 'sustain')

    await waitFor(() => expect(screen.getByRole('link', { name: /Xem chi tiết từ sustainable/i })).toHaveAttribute('href', '/vocabulary/item-1'))
    expect(notebookApi.getCatalogVocabulary).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'sustain', lang: 'EN' }), expect.anything())
    expect(screen.getByText('bền vững', { selector: '.dict-card__meaning' })).toBeInTheDocument()
  })

  it('sends lang=VI when searching Việt → Anh', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Việt → Anh' }))
    await userEvent.type(screen.getByRole('searchbox'), 'ben vung')

    await waitFor(() => expect(notebookApi.getCatalogVocabulary).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'ben vung', lang: 'VI' }), expect.anything()))
  })

  it('searches Vietnamese meanings automatically when the text has Vietnamese letters', async () => {
    renderPage()

    await userEvent.type(screen.getByRole('searchbox'), 'bền')

    await waitFor(() => expect(notebookApi.getCatalogVocabulary).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'bền', lang: 'VI' }), expect.anything()))
  })

  it('lists the words of a topic opened from the explore tab', async () => {
    renderPage('/vocabulary?topicId=topic-1')

    await waitFor(() => expect(notebookApi.getCatalogVocabulary).toHaveBeenCalledWith(
      expect.objectContaining({ topicId: 'topic-1' }), expect.anything()))
    expect(await screen.findByRole('link', { name: /Xem chi tiết từ sustainable/i })).toBeInTheDocument()
  })

  it('redirects guest to login when clicking save word', async () => {
    renderPage()
    await userEvent.type(screen.getByRole('searchbox'), 'sustainable')

    const saveButton = await screen.findByRole('button', { name: /Lưu từ sustainable vào sổ tay/i })
    await userEvent.click(saveButton)

    expect(sessionStorage.getItem('pendingSaveSenseId')).toBe('sense-1')
  })
})
