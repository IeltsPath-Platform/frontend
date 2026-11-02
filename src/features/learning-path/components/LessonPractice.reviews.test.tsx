import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { LessonPractice } from './LessonPractice'

const { getLessonPracticeSets, getPendingReviews, getHearts } = vi.hoisted(() => ({
  getLessonPracticeSets: vi.fn(), getPendingReviews: vi.fn(), getHearts: vi.fn(),
}))

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  learningApi: { getLessonPracticeSets, getPendingReviews, getHearts },
}))

beforeEach(() => {
  getLessonPracticeSets.mockResolvedValue({ lessonId: 'lesson-2', practiceStatus: 'PASSED', items: [] })
  getHearts.mockResolvedValue(null)
})

it.each([false, true])('labels the lesson review according to blocking=%s', async (blocking) => {
  getPendingReviews.mockResolvedValue([{
    reviewId: 'review-2', lessonId: 'lesson-2', knowledgePointCode: 'MAIN_IDEA', knowledgePointTitle: 'Ý chính', blocking,
  }])
  render(<MemoryRouter><LessonPractice lessonId="lesson-2" /></MemoryRouter>)
  expect(await screen.findByText(blocking ? 'Bài ôn bắt buộc' : 'Bài ôn tự chọn')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: blocking ? /Làm bài ôn/ : /Tiếp tục ôn/ }))
    .toHaveAttribute('href', '/learn/reviews/review-2')
  if (!blocking) expect(screen.queryByText('Làm xong để luyện tập tiếp và mở bài sau.')).not.toBeInTheDocument()
})

it('says the next lesson is open when the Practice passed without a blocking review', async () => {
  getLessonPracticeSets.mockResolvedValue({
    lessonId: 'lesson-2', practiceStatus: 'PASSED', practicePassReason: 'ATTEMPT_NOT_BLOCKED', items: [],
  })
  render(<MemoryRouter><LessonPractice lessonId="lesson-2" /></MemoryRouter>)
  expect(await screen.findByText(
    'Bài tiếp theo đã mở. Nên làm các bài ôn gợi ý để củng cố điểm còn yếu.',
  )).toBeInTheDocument()
})

it.each([
  [false, 'Nên ôn lại'],
  [true, 'Cần làm bài ôn'],
])('labels an attempted set whose review has blocking=%s as "%s"', async (blocking, label) => {
  getLessonPracticeSets.mockResolvedValue({
    lessonId: 'lesson-2', practiceStatus: 'REQUIRED', practicePassReason: null,
    items: [{
      packageId: 'set-1', code: 'P1', title: 'Luyện thêm P1', questionCount: 4, accessLevel: 'FREE', status: 'ATTEMPTED',
      bestPercent: 0.5, lastAttemptId: 'attempt-1', revealed: true,
    }],
  })
  getPendingReviews.mockResolvedValue([{
    reviewId: 'review-3', lessonId: 'lesson-2', sourcePackageId: 'set-1', blocking,
    knowledgePointCode: 'MAIN_IDEA', knowledgePointTitle: 'Ý chính',
  }])
  render(<MemoryRouter><LessonPractice lessonId="lesson-2" /></MemoryRouter>)
  expect(await screen.findByText(label)).toBeInTheDocument()
})
