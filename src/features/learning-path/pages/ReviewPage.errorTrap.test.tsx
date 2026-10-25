import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/toast/ToastProvider'
import type { ReviewDetail } from '~types/learningPath'
import { learningApi } from '../api'
import { ReviewPage } from './ReviewPage'

vi.mock('../api', async () => ({
  ...await import('../api/apiError'),
  learningApi: {
    getReview: vi.fn(), listTopics: vi.fn(), getHearts: vi.fn(), submitReview: vi.fn(), submitTheoryCheck: vi.fn(),
  },
}))
vi.mock('@/features/study-time/StudyActivityTracker', () => ({ StudyActivityTracker: () => null }))

const errorTrap = {
  code: 'TFNG_NG_AS_FALSE',
  name: 'Chọn False khi thông tin không được nêu',
  fixHint: 'Phân biệt "bài nói sai" với "bài không nói tới" trước khi chọn.',
}

const review: ReviewDetail = {
  reviewId: 'rev-1', topicId: 'topic-1', status: 'PENDING', stage: 'PRACTICE',
  knowledgePoint: { code: 'TFNG_FALSE_VS_NOT_GIVEN', title: 'False và Not Given' },
  sourceLessonTitle: 'Bài học trước', theory: [],
  set: {
    setId: 'set-1', packageCode: 'PS-TF-A', attemptNumber: 1, maxAttempts: 3, passage: { title: '', paragraphs: [] }, audio: null,
    questions: [{ id: 'q1', number: 1, prompt: 'The bees were kept in 1990.', options: [{ value: 'TRUE', label: 'True' }, { value: 'FALSE', label: 'False' }] }],
  },
  failedSets: 0, maxFailedSets: 3, theoryReason: null, resumeLessonId: 'lesson-1',
}

function renderReview(detail: ReviewDetail) {
  vi.mocked(learningApi.getReview).mockResolvedValue(detail)
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/learn/reviews/rev-1']}>
        <Routes><Route path="/learn/reviews/:reviewId" element={<ReviewPage />} /></Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('ResizeObserver', class { observe() {}; disconnect() {}; unobserve() {} })
  vi.mocked(learningApi.listTopics).mockResolvedValue([])
  vi.mocked(learningApi.getHearts).mockResolvedValue({ hearts: 3, maxHearts: 5, nextHeartAt: null, refillCost: 5 })
})

describe('ReviewPage error trap', () => {
  it('names the error the review works on, under the title', async () => {
    renderReview({ ...review, errorTrap })

    const note = await screen.findByRole('note', { name: 'Lỗi cần sửa' })
    expect(note).toHaveTextContent('Lỗi cần sửa: Chọn False khi thông tin không được nêu')
    expect(note).toHaveTextContent('Phân biệt "bài nói sai" với "bài không nói tới" trước khi chọn.')
    expect(screen.getByRole('heading', { name: 'False và Not Given', level: 1 })).toBeInTheDocument()
  })

  it('shows no error on a review without one', async () => {
    renderReview(review)

    await screen.findByRole('heading', { name: 'False và Not Given', level: 1 })
    expect(screen.queryByRole('note', { name: 'Lỗi cần sửa' })).not.toBeInTheDocument()
  })

  it('labels an optional review as optional and keeps the required label by default', async () => {
    const { unmount } = renderReview({ ...review, blocking: false })
    expect(await screen.findByText(/Bài ôn tự chọn/)).toBeInTheDocument()
    expect(screen.queryByText(/Bài ôn bắt buộc/)).not.toBeInTheDocument()
    unmount()

    renderReview(review)
    expect(await screen.findByText(/Bài ôn bắt buộc/)).toBeInTheDocument()
  })

  it('drops the error once the review is finished', async () => {
    renderReview({ ...review, status: 'DONE', set: null, errorTrap })

    await screen.findByRole('heading', { name: 'Đã hoàn thành bài ôn' })
    expect(screen.queryByRole('note', { name: 'Lỗi cần sửa' })).not.toBeInTheDocument()
  })
})
