import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LessonDetail } from '~types/learningPath'
import { LessonView } from './LessonPage'

const { getLessonResources, getTopicLessons, getLessonPracticeSets, getPendingReviews, completeLesson } = vi.hoisted(() => ({
  getLessonResources: vi.fn(), getTopicLessons: vi.fn(), getLessonPracticeSets: vi.fn(), getPendingReviews: vi.fn(),
  completeLesson: vi.fn(),
}))

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  learningApi: { getLessonResources, getTopicLessons, getLessonPracticeSets, getPendingReviews, completeLesson },
}))
vi.mock('@/features/study-time/StudyActivityTracker', () => ({ StudyActivityTracker: () => null }))

const lesson: LessonDetail = {
  id: 'lesson-1', topicId: 'topic-1', topicTitle: 'Trees: Writing', title: 'Trees in the city', sortOrder: 1,
  status: 'AVAILABLE', nextLessonId: null, pendingReviews: [],
  blocks: [{ id: 'text-a', type: 'TEXT', sortOrder: 1, text: '## Nêu quan điểm\n\nMở bài, hai ý chính, kết bài.' }],
}

function topicWith(practiceStatus: 'LOCKED' | 'REQUIRED') {
  return {
    topic: { course: null },
    lessons: [{ id: 'lesson-1', code: 'L1', title: 'Trees in the city', sortOrder: 1, status: 'AVAILABLE', practiceStatus, practicePassReason: null }],
  }
}

function renderLesson() {
  return render(<MemoryRouter initialEntries={['/learn/lessons/lesson-1?view=summary']}><LessonView lesson={lesson} /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  getLessonResources.mockResolvedValue({ slides: [], documents: [], summaryMarkdown: null })
  getLessonPracticeSets.mockResolvedValue({ items: [{ packageId: 'set-1' }, { packageId: 'set-2' }] })
  getPendingReviews.mockResolvedValue([])
  completeLesson.mockResolvedValue({ lessonId: 'lesson-1', nextLessonId: null, pendingReviews: [] })
})

describe('completing a lesson that has Practice sets and no exercises', () => {
  it('offers "Hoàn thành bài" while its Practice is still locked, since completing the lesson is what opens the Practice', async () => {
    getTopicLessons.mockResolvedValue(topicWith('LOCKED'))
    renderLesson()

    // The button sits in the side card and again in the bar of a narrow screen.
    const [complete] = await screen.findAllByRole('button', { name: 'Hoàn thành bài' })
    fireEvent.click(complete)

    expect(completeLesson).toHaveBeenCalledWith('lesson-1')
  })

  it('does not offer it as the way forward once the Practice is open and required', async () => {
    getTopicLessons.mockResolvedValue(topicWith('REQUIRED'))
    renderLesson()

    expect(await screen.findByRole('navigation', { name: 'Nội dung bài học' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hoàn thành bài' })).not.toBeInTheDocument()
  })
})
