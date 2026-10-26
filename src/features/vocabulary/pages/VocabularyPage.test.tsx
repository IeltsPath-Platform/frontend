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
    getSuggestions: vi.fn().mockResolvedValue([]),
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
    {
      id: 'item-2',
      lemma: 'biodiversity',
      ipa: '/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/',
      pronunciationAudioReference: null,
      senses: [
        {
          id: 'sense-2',
          vietnameseMeaning: 'đa dạng sinh học',
          englishDefinition: 'the variety of plant and animal life',
          exampleSentence: 'Preserving biodiversity is crucial.',
          partOfSpeech: 'noun',
        },
      ],
    },
  ],
  page: 0,
  size: 20,
  total: 2,
}

describe('VocabularyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    vi.mocked(notebookApi.getCatalogVocabulary).mockResolvedValue(MOCK_CATALOG)
    vi.mocked(notebookApi.getSavedNotebookSenses).mockResolvedValue([])
  })

  it('renders public catalog words from real API instead of mock', async () => {
    render(
      <ToastProvider>
        <MemoryRouter>
          <VocabularyPage />
        </MemoryRouter>
      </ToastProvider>
    )

    expect(screen.getByRole('heading', { level: 1, name: /Từ điển/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('sustainable')).toBeInTheDocument()
      expect(screen.getByText('biodiversity')).toBeInTheDocument()
    })

    expect(screen.getByText(/bền vững/i)).toBeInTheDocument()
    expect(screen.getByText(/đa dạng sinh học/i)).toBeInTheDocument()
  })

  it('redirects guest to login when clicking save word', async () => {
    render(
      <ToastProvider>
        <MemoryRouter>
          <VocabularyPage />
        </MemoryRouter>
      </ToastProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('sustainable')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /Lưu từ sustainable vào sổ tay/i })
    expect(saveButton).toBeInTheDocument()
    await userEvent.click(saveButton)

    expect(sessionStorage.getItem('pendingSaveSenseId')).toBe('sense-1')
  })
})

