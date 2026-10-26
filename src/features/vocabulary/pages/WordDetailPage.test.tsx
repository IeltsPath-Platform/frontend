import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WordDetailPage } from './WordDetailPage'
import { notebookApi } from '../api/notebookApi'

vi.mock('../api/notebookApi', () => ({
  notebookApi: {
    getVocabularyItem: vi.fn(),
    getSavedNotebookSenses: vi.fn(),
    getNotebookEntries: vi.fn(),
    saveNotebookEntry: vi.fn(),
    setNotebookEntryLevel: vi.fn(),
    saveSenseNote: vi.fn(),
  },
}))

vi.mock('@/features/auth/authSession', () => ({
  useAuthSession: () => ({ isLoggedIn: true, userName: 'Learner' }),
  setDemoTier: vi.fn(),
}))

const MOCK_DETAIL = {
  id: 'word-123',
  lemma: 'resilience',
  phoneticUk: '/rɪˈzɪl.jəns/',
  phoneticUs: '/rɪˈzɪl.jəns/',
  cefrLevel: 'C1',
  frequencyRank: 2450,
  academicWordList: true,
  topic: 'Psychology',
  senses: [
    {
      id: 'sense-100',
      vietnameseMeaning: 'khả năng phục hồi, kiên cường',
      englishDefinition: 'the capacity to recover quickly from difficulties',
      exampleSentence: 'Courage and resilience are essential.',
      partOfSpeech: 'noun',
    },
  ],
  collocations: [
    { id: 'c1', phrase: 'build resilience', meaning: 'xây dựng sự kiên cường', example: 'Practice helps build resilience.' },
  ],
  thesaurus: [
    { id: 't1', word: 'toughness', relation: 'SYNONYM' as const },
    { id: 't2', word: 'fragility', relation: 'ANTONYM' as const },
  ],
  commonMistakes: [
    { id: 'm1', mistake: 'resiliance', correction: 'resilience', explanation: 'Chính tả với chữ e, không phải a.' },
  ],
  examples: [
    { id: 'e1', sentence: 'The team showed remarkable resilience.', translation: 'Đội bóng đã thể hiện sự kiên cường đáng nể.' },
  ],
  counts: {
    definitions: 1,
    collocations: 1,
    thesaurus: 2,
    commonMistakes: 1,
    examples: 1,
  },
}

describe('WordDetailPage', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    vi.clearAllMocks()
    vi.mocked(notebookApi.getVocabularyItem).mockResolvedValue(MOCK_DETAIL)
    vi.mocked(notebookApi.getSavedNotebookSenses).mockResolvedValue(['sense-100'])
    vi.mocked(notebookApi.getNotebookEntries).mockResolvedValue({
      items: [
        {
          flashcardId: 'fc-1',
          vocabularySenseId: 'sense-100',
          vocabularyItemId: 'word-123',
          lemma: 'resilience',
          ipa: '/rɪˈzɪl.jəns/',
          pronunciationAudioReference: null,
          partOfSpeech: 'noun',
          vietnameseMeaning: 'khả năng phục hồi',
          englishDefinition: null,
          exampleSentence: null,
          imageUrl: null,
          level: 'FAMILIAR',
          leitnerBox: 2,
          reviewCount: 3,
          lastReviewedAt: null,
          nextReviewAt: null,
          createdAt: '2026-10-25T00:00:00Z',
          note: 'Từ rất hay gặp trong bài đọc IELTS.',
        },
      ],
      page: 0,
      size: 10,
      total: 1,
    })
  })

  it('renders word header, tabs, quick info, and saved understanding level', async () => {
    render(
      <MemoryRouter initialEntries={['/vocabulary/word-123']}>
        <Routes>
          <Route path="/vocabulary/:id" element={<WordDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'resilience' })).toBeInTheDocument()
    })

    expect(screen.getAllByText('C1').length).toBeGreaterThan(0)
    expect(screen.getByText('#2450')).toBeInTheDocument()
    expect(screen.getByText('Psychology')).toBeInTheDocument()

    // Tab buttons with counts
    expect(screen.getByRole('button', { name: /Collocations/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Từ đồng \/ Trái nghĩa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lỗi thường gặp/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ví dụ/i })).toBeInTheDocument()

    // Switch tab to collocations
    await userEvent.click(screen.getByRole('button', { name: /Collocations/i }))
    expect(screen.getByText('build resilience')).toBeInTheDocument()
  })
})

