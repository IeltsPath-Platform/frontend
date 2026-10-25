import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LessonPracticeSets, PracticeAttemptReview as Review } from '~types/learningPath'
import { LessonPractice } from './LessonPractice'

const { api } = vi.hoisted(() => ({
  api: {
    getLessonPracticeSets: vi.fn(), getPendingReviews: vi.fn(), getHearts: vi.fn(),
    getPracticeAttemptReview: vi.fn(), startPracticeAttempt: vi.fn(),
  },
}))

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  learningApi: api,
}))
vi.mock('@/features/study-time/StudyActivityTracker', () => ({ StudyActivityTracker: () => null }))

const item = (overrides: Record<string, unknown>) => ({
  packageId: 'p1', code: 'PS-R1', title: 'Đọc hiểu 1', questionCount: 2, accessLevel: 'FREE',
  status: 'PASSED', bestPercent: 0.5, lastAttemptId: 'a1', revealed: true, ...overrides,
})

const catalog = (items: ReturnType<typeof item>[]): LessonPracticeSets => ({
  lessonId: 'l1', skill: 'READING', lessonCompleted: true, practiceStatus: 'PASSED', practicePassReason: 'FIRST_SUBMISSION',
  items: items as LessonPracticeSets['items'],
})

const review: Review = {
  attempt: {
    attemptId: 'a1', packageId: 'p1', packageVersionId: 'v1', passage: null, audio: null, essays: [],
    questions: [
      { id: 'q1', number: 1, prompt: 'Pick the synonym', options: [{ value: 'A', label: 'Big' }, { value: 'B', label: 'Large' }] },
      { id: 'q2', number: 2, prompt: 'Pick the antonym', options: [{ value: 'A', label: 'Hot' }, { value: 'B', label: 'Cold' }] },
    ],
  },
  result: {
    attemptId: 'a1', correct: 1, total: 2, percent: 0.5, passed: false, countedAsEvidence: true, reviewsCreated: [], gamification: null,
    results: [
      { questionId: 'q1', correct: true, correctAnswer: 'B', explanation: 'Large means big.' },
      { questionId: 'q2', correct: false, correctAnswer: 'B', explanation: 'Cold is the opposite of hot.' },
    ],
  },
}

function renderPractice() {
  return render(<MemoryRouter><LessonPractice lessonId="l1" /></MemoryRouter>)
}

describe('practice result review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getPendingReviews.mockResolvedValue([])
    api.getHearts.mockResolvedValue(null)
  })

  it('offers the result and a retry on a set that was already submitted', async () => {
    api.getLessonPracticeSets.mockResolvedValue(catalog([item({})]))
    renderPractice()

    expect(await screen.findByRole('button', { name: 'Xem kết quả: Đọc hiểu 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Làm lại/ })).toBeInTheDocument()
  })

  it('has no result button on a set that was never submitted', async () => {
    api.getLessonPracticeSets.mockResolvedValue(catalog([item({ status: 'AVAILABLE', lastAttemptId: null, revealed: false })]))
    renderPractice()

    expect(await screen.findByRole('button', { name: /Bắt đầu/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Xem kết quả/ })).not.toBeInTheDocument()
  })

  it('opens the saved result read-only and goes back to the list', async () => {
    api.getLessonPracticeSets.mockResolvedValue(catalog([item({})]))
    api.getPracticeAttemptReview.mockResolvedValue(review)
    renderPractice()
    fireEvent.click(await screen.findByRole('button', { name: 'Xem kết quả: Đọc hiểu 1' }))

    expect(await screen.findByRole('heading', { name: 'Đọc hiểu 1' })).toBeInTheDocument()
    expect(api.getPracticeAttemptReview).toHaveBeenCalledWith('a1')
    expect(screen.getByRole('status')).toHaveTextContent('Chưa đạt · 50% (1/2 câu đúng)')
    const items = within(screen.getByRole('list', { name: 'Kết quả từng câu' })).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Đáp án đúng: B · Large')
    expect(items[1]).toHaveTextContent('Cold is the opposite of hot.')
    expect(screen.queryByRole('button', { name: /Nộp/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /Về danh sách luyện tập/ })[0])
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xem kết quả: Đọc hiểu 1' })).toBeInTheDocument())
  })

  it('shows the error of a wrong answer under that question only', async () => {
    api.getLessonPracticeSets.mockResolvedValue(catalog([item({})]))
    api.getPracticeAttemptReview.mockResolvedValue({
      ...review,
      result: {
        ...review.result,
        results: [
          review.result.results[0],
          {
            ...review.result.results[1],
            error: { code: 'KEYWORD_MATCH_ONLY', name: 'Chọn đáp án chỉ vì trùng từ khóa', fixHint: 'Kiểm tra cả câu.' },
          },
        ],
      },
    })
    renderPractice()
    fireEvent.click(await screen.findByRole('button', { name: 'Xem kết quả: Đọc hiểu 1' }))

    const items = within(await screen.findByRole('list', { name: 'Kết quả từng câu' })).getAllByRole('listitem')
    expect(within(items[0]).queryByRole('note', { name: 'Lỗi cần sửa' })).not.toBeInTheDocument()
    expect(within(items[1]).getByRole('note', { name: 'Lỗi cần sửa' })).toHaveTextContent('Chọn đáp án chỉ vì trùng từ khóa')
    expect(within(items[1]).getByRole('note', { name: 'Lỗi cần sửa' })).toHaveTextContent('Kiểm tra cả câu.')
  })

  it('says so when the result cannot be loaded', async () => {
    api.getLessonPracticeSets.mockResolvedValue(catalog([item({})]))
    api.getPracticeAttemptReview.mockRejectedValue(new Error('boom'))
    renderPractice()
    fireEvent.click(await screen.findByRole('button', { name: 'Xem kết quả: Đọc hiểu 1' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('optional review notice', () => {
  it('tells the learner that a writing review was suggested', async () => {
    api.getLessonPracticeSets.mockResolvedValue(catalog([item({})]))
    api.getPendingReviews.mockResolvedValue([
      { reviewId: 'rev-w', knowledgePointId: 'kp-w', lessonId: 'l1', knowledgePointCode: 'DEMO_WRITING_CRITERION_LR', knowledgePointTitle: 'Vốn từ vựng (LR)', blocking: false },
    ])
    api.getHearts.mockResolvedValue(null)
    renderPractice()

    expect(await screen.findByText(/gợi ý bài ôn tự chọn/)).toBeInTheDocument()
    expect(screen.getByText('Bài ôn tự chọn')).toBeInTheDocument()
  })
})
