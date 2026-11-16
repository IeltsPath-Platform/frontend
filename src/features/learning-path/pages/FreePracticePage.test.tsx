import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PracticeAttemptReview, PracticeSubmissionResult } from '~types/learningPath'
import { FreePracticePage } from './FreePracticePage'

const { api } = vi.hoisted(() => ({
  api: { getPracticeAttempt: vi.fn(), getPracticeAttemptReview: vi.fn(), getHearts: vi.fn() },
}))

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  learningApi: api,
}))

const submitted: PracticeSubmissionResult = {
  attemptId: 'a1', correct: 1, total: 3, percent: 1 / 3, passed: false, countedAsEvidence: true, reviewsCreated: [], gamification: null,
  results: [],
}
const review: PracticeAttemptReview = {
  attempt: {
    attemptId: 'a1', packageId: 'p1', packageVersionId: 'v1', passage: null, audio: null, essays: [],
    questions: [
      { id: 'q1', number: 1, prompt: 'Overall, the trend is…', options: [{ value: 'A', label: 'rising' }, { value: 'B', label: 'falling' }] },
      { id: 'q2', number: 2, prompt: 'Choose the verb for a rise', options: [{ value: 'A', label: 'climb' }, { value: 'B', label: 'drop' }] },
      { id: 'q3', number: 3, prompt: 'Which figure is highest?', options: [{ value: 'A', label: '40%' }, { value: 'B', label: '60%' }] },
    ],
  },
  result: {
    ...submitted,
    results: [
      { questionId: 'q1', correct: true, correctAnswer: 'A', submittedAnswer: 'A', explanation: 'The chart rises.' },
      { questionId: 'q2', correct: false, correctAnswer: 'A', submittedAnswer: 'B', explanation: 'Climb describes an increase.' },
      { questionId: 'q3', correct: false, correctAnswer: 'B', submittedAnswer: 'A', explanation: 'Sixty is the largest.' },
    ],
  },
}

function show(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/learn/practice/a1', state }]}>
      <Routes>
        <Route path="/learn/practice/:attemptId" element={<FreePracticePage />} />
        <Route path="/submission-history" element={<p>Trang lịch sử</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('a free practice set that was already submitted', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getHearts.mockResolvedValue(null)
    api.getPracticeAttempt.mockResolvedValue(submitted)
    api.getPracticeAttemptReview.mockResolvedValue(review)
  })

  it('shows the set as it was filled in: the learner\'s choices, the right options marked, the explanation and the score', async () => {
    show({ freePractice: { pointName: 'Hoàn thành yêu cầu Task 1 (TA)', pointCode: 'TA', backTo: '/submission-history', backLabel: 'Lịch sử nộp bài' } })

    const list = await screen.findByRole('list', { name: 'Bài làm đã nộp' })
    expect(api.getPracticeAttemptReview).toHaveBeenCalledWith('a1')
    expect(screen.getByRole('status')).toHaveTextContent('Chưa đạt · 33% (1/3 câu đúng)')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    const option = (item: HTMLElement, label: string) => within(item).getByText(label).closest('label')!
    expect(within(items[0]).getByText('Bạn trả lời đúng')).toBeInTheDocument()
    expect(option(items[0], 'rising')).toHaveAttribute('data-verdict', 'correct')
    expect(within(items[1]).getByText('Bạn trả lời sai')).toBeInTheDocument()
    expect(option(items[1], 'drop')).toHaveAttribute('data-verdict', 'wrong')
    expect(option(items[1], 'climb')).toHaveAttribute('data-verdict', 'correct')
    expect(items[1]).toHaveTextContent('Climb describes an increase.')
    expect(option(items[2], '40%')).toHaveAttribute('data-verdict', 'wrong')
    expect(option(items[2], '60%')).toHaveAttribute('data-verdict', 'correct')
    expect(screen.queryByRole('button', { name: /Nộp/ })).not.toBeInTheDocument()
  })

  it('is plain: the page names the set once, there is no second title and no back button, the trail leads back', async () => {
    show({ freePractice: { pointName: 'Hoàn thành yêu cầu Task 1 (TA)', pointCode: 'TA', backTo: '/submission-history', backLabel: 'Lịch sử nộp bài' } })

    await screen.findByRole('list', { name: 'Bài làm đã nộp' })
    expect(screen.getAllByRole('heading', { name: 'Hoàn thành yêu cầu Task 1 (TA)' })).toHaveLength(1)
    expect(screen.queryByText(/^Xem lại/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Về / })).not.toBeInTheDocument()

    await userEvent.click(within(screen.getByRole('navigation', { name: 'Đường dẫn trang' })).getByRole('link', { name: 'Lịch sử nộp bài' }))
    expect(await screen.findByText('Trang lịch sử')).toBeInTheDocument()
  })

  it('follows the menu when it was opened from the history: Trang chủ, Lịch sử nộp bài on its tab, the set', async () => {
    show({ freePractice: { pointName: 'TA', pointCode: 'TA', backTo: '/submission-history?tab=knowledge', backLabel: 'Lịch sử nộp bài' } })

    const trail = await screen.findByRole('navigation', { name: 'Đường dẫn trang' })
    expect(within(trail).getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/home')
    expect(within(trail).getByRole('link', { name: 'Lịch sử nộp bài' })).toHaveAttribute('href', '/submission-history?tab=knowledge')
    expect(within(trail).getByText('Luyện · TA')).toHaveAttribute('aria-current', 'page')
    expect(within(trail).queryByRole('link', { name: 'Khóa học' })).not.toBeInTheDocument()
  })

  it('keeps the essay result between the history and the set when it was opened from an essay', async () => {
    const backTo = '/practice/writing/submissions/s-1/result?from=%2Fsubmission-history%3Ftab%3Dpractice%26skill%3Dwriting'
    show({ freePractice: { pointName: 'TA', pointCode: 'TA', backTo, backLabel: 'Kết quả bài viết' } })

    const trail = await screen.findByRole('navigation', { name: 'Đường dẫn trang' })
    expect(within(trail).getByRole('link', { name: 'Lịch sử nộp bài' })).toHaveAttribute('href', '/submission-history?tab=practice&skill=writing')
    expect(within(trail).getByRole('link', { name: 'Kết quả bài viết' })).toHaveAttribute('href', backTo)
  })

  it('keeps the tree as the parent when it was opened from the knowledge tree', async () => {
    show({ freePractice: { pointName: 'TA', pointCode: 'TA', backTo: '/learn/courses/c1/tree' } })

    const trail = await screen.findByRole('navigation', { name: 'Đường dẫn trang' })
    expect(within(trail).getByRole('link', { name: 'Khóa học' })).toHaveAttribute('href', '/learn')
    expect(within(trail).getByRole('link', { name: 'Cây kiến thức' })).toHaveAttribute('href', '/learn/courses/c1/tree')
  })

  it('still shows the set when the page was reloaded and the way back is lost', async () => {
    show()

    expect(await screen.findByRole('list', { name: 'Bài làm đã nộp' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cây kiến thức' })).toHaveAttribute('href', '/learn')
  })
})
