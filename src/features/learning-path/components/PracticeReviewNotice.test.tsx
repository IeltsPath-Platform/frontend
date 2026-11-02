import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import type { PracticeReviewCreated } from '~types/learningPath'
import { PracticeReviewNotice } from './PracticeReviewNotice'

const suggestion = (reviewId: string): PracticeReviewCreated => ({
  reviewId, knowledgePointId: 'kp-1', stage: 'PRACTICE', blocking: false,
})
const blocking = (reviewId: string): PracticeReviewCreated => ({
  reviewId, knowledgePointId: 'kp-2', stage: 'THEORY', blocking: true,
})

it('invites the learner to review without holding the lesson when only suggestions were created', () => {
  render(<MemoryRouter><PracticeReviewNotice created={[suggestion('review-a'), suggestion('review-b')]} /></MemoryRouter>)
  expect(screen.getByText('Nên ôn lại 2 điểm kiến thức còn yếu. Bạn vẫn học tiếp được.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Ôn ngay/ })).toHaveAttribute('href', '/learn/reviews/review-a')
})

it('shows the blocking review first when one of the created reviews blocks', () => {
  render(<MemoryRouter><PracticeReviewNotice created={[suggestion('review-a'), blocking('review-b')]} /></MemoryRouter>)
  expect(screen.getByText('Đã tạo bài ôn bắt buộc sau lần luyện này.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Làm bài ôn/ })).toHaveAttribute('href', '/learn/reviews/review-b')
})

it('renders nothing when no review was created', () => {
  const { container } = render(<MemoryRouter><PracticeReviewNotice created={[]} /></MemoryRouter>)
  expect(container).toBeEmptyDOMElement()
})
