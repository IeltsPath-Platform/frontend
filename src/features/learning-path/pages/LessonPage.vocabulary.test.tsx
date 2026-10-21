import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LessonDetail } from '~types/learningPath'
import { getLessonVocabularySenses } from '../api/lessonVocabularyApi'
import { LessonView } from './LessonPage'

const { getLessonResources, getTopicLessons, getLessonPracticeSets, getPendingReviews } = vi.hoisted(() => ({
  getLessonResources: vi.fn(), getTopicLessons: vi.fn(), getLessonPracticeSets: vi.fn(), getPendingReviews: vi.fn(),
}))

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  learningApi: { getLessonResources, getTopicLessons, getLessonPracticeSets, getPendingReviews },
}))
vi.mock('../api/lessonVocabularyApi', () => ({ getLessonVocabularySenses: vi.fn() }))
vi.mock('@/features/study-time/StudyActivityTracker', () => ({ StudyActivityTracker: () => null }))

const lesson: LessonDetail = {
  id: 'lesson-1', topicId: 'topic-1', topicTitle: 'Reading', title: 'Finding context', sortOrder: 1,
  status: 'AVAILABLE', nextLessonId: null, pendingReviews: [],
  blocks: [
    { id: 'vocab-a', type: 'VOCABULARY', sortOrder: 1, vocabularySenseIds: ['sense-b', 'sense-a', 'sense-b'] },
    { id: 'vocab-b', type: 'VOCABULARY', sortOrder: 2, vocabularySenseIds: ['sense-c', 'sense-a'] },
    { id: 'exercise', type: 'EXERCISE', sortOrder: 3, title: 'Exercise', instructions: '', knowledgePointCode: '', questions: [], state: 'NOT_ATTEMPTED', savedAnswers: null, solutions: null },
  ],
}

function Location() {
  const location = useLocation()
  return <output aria-label="Current location">{location.pathname}{location.search}</output>
}

function renderLesson(entry = '/learn/lessons/lesson-1', detail = lesson) {
  return render(<MemoryRouter initialEntries={[entry]}><LessonView lesson={detail} /><Location /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  getLessonResources.mockResolvedValue({ slides: [], documents: [], summaryMarkdown: null })
  getTopicLessons.mockResolvedValue({ topic: { course: null }, lessons: [] })
  getLessonPracticeSets.mockResolvedValue({ items: [] })
  getPendingReviews.mockResolvedValue([])
  vi.mocked(getLessonVocabularySenses).mockResolvedValue([{
    senseId: 'sense-b', vocabularyItemId: 'item-1', lemma: 'context', ipa: null, partOfSpeech: 'NOUN',
    englishDefinition: 'A situation', vietnameseMeaning: null, exampleSentence: null,
    pronunciationAudioReference: null, imageUrl: null,
  }])
})

describe('lesson vocabulary navigation', () => {
  it('counts unique senses and fetches Library only when the learner opens vocabulary', async () => {
    const user = userEvent.setup()
    renderLesson()
    const nav = screen.getByRole('navigation', { name: 'Nội dung bài học' })
    const vocabulary = within(nav).getByRole('link', { name: 'Từ vựng 3' })
    const exercise = within(nav).getByRole('link', { name: 'Bài tập 1' })
    expect(vocabulary).toHaveAttribute('href', '/learn/lessons/lesson-1?view=vocabulary')
    expect(vocabulary.compareDocumentPosition(exercise) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(getLessonVocabularySenses).not.toHaveBeenCalled()

    for (let step = 0; step < 12 && document.activeElement !== vocabulary; step += 1) await user.tab()
    expect(vocabulary).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('heading', { name: 'context' })).toBeInTheDocument()
    expect(vocabulary).toHaveAttribute('aria-current', 'page')
    expect(screen.getByLabelText('Current location')).toHaveTextContent('/learn/lessons/lesson-1?view=vocabulary')
    expect(getLessonVocabularySenses).toHaveBeenCalledWith(['sense-b', 'sense-a', 'sense-c'])
  })

  it('opens a vocabulary deep link even when lesson slide resources fail', async () => {
    getLessonResources.mockRejectedValue(new Error('Slides unavailable'))
    renderLesson('/learn/lessons/lesson-1?view=vocabulary')
    expect(await screen.findByRole('heading', { name: 'context' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Từ vựng' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Từ vựng 3' })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps vocabulary reachable for lessons with no words without a Library request', async () => {
    renderLesson('/learn/lessons/lesson-1?view=vocabulary', { ...lesson, blocks: [] })
    expect(screen.getByRole('link', { name: 'Từ vựng' })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByText('Bài học này chưa có từ vựng.')).toBeInTheDocument()
    expect(getLessonVocabularySenses).not.toHaveBeenCalled()
  })
})
