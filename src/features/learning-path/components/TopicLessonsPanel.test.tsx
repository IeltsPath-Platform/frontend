import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/toast/ToastProvider'
import type { LessonSummary, ReviewRef } from '~types/learningPath'
import { TopicLessonsView } from './TopicLessonsPanel'

const lessons: LessonSummary[] = [
  { id: 'lesson-1', title: 'Bài một', sortOrder: 1, status: 'COMPLETED', estimatedMinutes: 10, lockedReason: null },
  { id: 'lesson-2', title: 'Bài hai', sortOrder: 2, status: 'COMPLETED', estimatedMinutes: 10, lockedReason: null },
  { id: 'lesson-3', title: 'Bài ba', sortOrder: 3, status: 'LOCKED', estimatedMinutes: 10, lockedReason: 'Mở sau khi hoàn thành bài ôn.', blockingReviewId: 'review-2' },
  { id: 'lesson-4', title: 'Bài bốn', sortOrder: 4, status: 'LOCKED', estimatedMinutes: 10, lockedReason: 'Mở sau khi hoàn thành bài ôn.', blockingReviewId: 'review-2' },
]
const review: ReviewRef = { reviewId: 'review-2', lessonId: 'lesson-2', knowledgePointCode: 'MAIN_IDEA', knowledgePointTitle: 'Ý chính' }

function renderLessons(pendingReviews: ReviewRef[], rows = lessons) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <TopicLessonsView lessons={rows} pendingReviews={pendingReviews} finalTest={{ title: 'Kiểm tra chặng', testStatus: 'LOCKED', questionCount: 0, lastPercent: null }} topicId="topic-1" onChanged={() => {}} />
      </ToastProvider>
    </MemoryRouter>,
  )
}

function row(title: string) {
  return screen.getByText(title).closest('li')!
}

describe('TopicLessonsView review ownership', () => {
  it('places the review action only on its owning lesson and keeps later lessons locked', () => {
    const { container } = renderLessons([review])
    const owner = row('Bài hai')
    expect(within(owner).getByRole('link', { name: /Làm bài ôn/ })).toHaveAttribute('href', '/learn/reviews/review-2')
    expect(within(owner).getByRole('link', { name: /Bài hai/ })).toHaveAttribute('href', '/learn/lessons/lesson-2')
    expect(within(owner).getByText('Cần làm bài ôn')).toBeInTheDocument()
    for (const title of ['Bài ba', 'Bài bốn']) {
      expect(within(row(title)).queryByRole('link')).not.toBeInTheDocument()
      expect(within(row(title)).getByText('Mở sau khi hoàn thành bài ôn.')).toBeInTheDocument()
      expect(row(title).querySelector('[aria-disabled="true"]')).toBeInTheDocument()
    }
    expect(screen.getAllByRole('link', { name: /Làm bài ôn/ })).toHaveLength(1)
    expect(container.querySelector('a a')).not.toBeInTheDocument()
  })

  it('preserves the current-step lesson link when an available lesson owns a review', () => {
    const available: LessonSummary[] = lessons.map((lesson) => lesson.id === 'lesson-2' ? { ...lesson, status: 'AVAILABLE' } : lesson)
    renderLessons([review], available)
    const owner = row('Bài hai')
    expect(within(owner).getByRole('link', { name: /Bài hai/ })).toHaveAttribute('aria-current', 'step')
    expect(within(owner).getByRole('link', { name: /Làm bài ôn/ })).toHaveAttribute('href', '/learn/reviews/review-2')
  })

  it('does not assign a review to a lesson from its blocking review id', () => {
    renderLessons([{ ...review, lessonId: undefined }])
    expect(screen.queryByRole('link', { name: /Làm bài ôn/ })).not.toBeInTheDocument()
    expect(screen.getByText('Bài hai').closest('a')).toHaveAttribute('href', '/learn/lessons/lesson-2')
  })

  it('maps each pending review to its actual lesson rather than a fixed lesson number', () => {
    renderLessons([{ ...review, reviewId: 'review-1', lessonId: 'lesson-1' }, review])
    expect(within(row('Bài một')).getByRole('link', { name: /Làm bài ôn/ })).toHaveAttribute('href', '/learn/reviews/review-1')
    expect(within(row('Bài hai')).getByRole('link', { name: /Làm bài ôn/ })).toHaveAttribute('href', '/learn/reviews/review-2')
    expect(within(row('Bài ba')).queryByRole('link')).not.toBeInTheDocument()
    expect(within(row('Bài bốn')).queryByRole('link')).not.toBeInTheDocument()
  })
})
