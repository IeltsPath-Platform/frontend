import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LessonDetail } from '~types/learningPath'
import { LessonView } from './LessonPage'

const { getLessonResources, getTopicLessons, getLessonPracticeSets, getPendingReviews } = vi.hoisted(() => ({
  getLessonResources: vi.fn(), getTopicLessons: vi.fn(), getLessonPracticeSets: vi.fn(), getPendingReviews: vi.fn(),
}))

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  learningApi: { getLessonResources, getTopicLessons, getLessonPracticeSets, getPendingReviews },
}))
vi.mock('@/features/study-time/StudyActivityTracker', () => ({ StudyActivityTracker: () => null }))

const exercise = { id: 'exercise', type: 'EXERCISE' as const, sortOrder: 3, title: 'Exercise', instructions: '', knowledgePointCode: '', questions: [], state: 'NOT_ATTEMPTED' as const, savedAnswers: null, solutions: null }
const lesson: LessonDetail = {
  id: 'lesson-1', topicId: 'topic-1', topicTitle: 'Reading', title: 'Signs and notices', sortOrder: 1,
  status: 'AVAILABLE', nextLessonId: null, pendingReviews: [],
  blocks: [
    { id: 'text-a', type: 'TEXT', sortOrder: 1, text: '## Đọc động từ chính\n\nTìm "No running" và "must".' },
    { id: 'text-b', type: 'TEXT', sortOrder: 2, text: '## Chú ý con số\n\nTuổi và giờ hay là đáp án.' },
    exercise,
  ],
}

function renderLesson(entry = '/learn/lessons/lesson-1?view=summary', detail = lesson) {
  return render(<MemoryRouter initialEntries={[entry]}><LessonView lesson={detail} /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  getLessonResources.mockResolvedValue({ slides: [], documents: [], summaryMarkdown: '## Ghi nhớ nhanh\n\nĐọc câu hỏi trước.' })
  getTopicLessons.mockResolvedValue({ topic: { course: null }, lessons: [] })
  getLessonPracticeSets.mockResolvedValue({ items: [] })
  getPendingReviews.mockResolvedValue([])
})

describe('lecture text in the lesson summary', () => {
  it('shows the lecture text ahead of the summary sections, in lesson order', async () => {
    renderLesson()
    const first = await screen.findByRole('heading', { name: 'Đọc động từ chính' })
    const second = screen.getByRole('heading', { name: 'Chú ý con số' })
    const summary = screen.getByRole('heading', { name: 'Ghi nhớ nhanh' })
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(second.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Tuổi và giờ hay là đáp án.')).toBeInTheDocument()
  })

  it('counts the lecture text blocks with the summary on the tab, and has no tab of its own', async () => {
    renderLesson()
    const nav = screen.getByRole('navigation', { name: 'Nội dung bài học' })
    expect(await within(nav).findByRole('link', { name: 'Lesson Summary 3' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).queryByRole('link', { name: /Lý thuyết/ })).not.toBeInTheDocument()
  })

  it('shows the lecture text of a lesson that has no summary of its own', async () => {
    getLessonResources.mockResolvedValue({ slides: [], documents: [], summaryMarkdown: null })
    renderLesson()
    expect(await screen.findByRole('heading', { name: 'Đọc động từ chính' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ghi nhớ nhanh' })).not.toBeInTheDocument()
  })

  it('still shows the lecture text when the other resources cannot be loaded', async () => {
    getLessonResources.mockRejectedValue(new Error('Resources unavailable'))
    renderLesson()
    expect(await screen.findByRole('heading', { name: 'Đọc động từ chính' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('leaves the summary as it was for a lesson with no lecture text', async () => {
    renderLesson('/learn/lessons/lesson-1?view=summary', { ...lesson, blocks: [exercise] })
    expect(await screen.findByRole('heading', { name: 'Ghi nhớ nhanh' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lesson Summary 1' })).toBeInTheDocument()
  })
})
