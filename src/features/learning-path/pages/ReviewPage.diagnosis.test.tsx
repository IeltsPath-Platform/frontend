import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/toast/ToastProvider'
import type { Diagnostic, ReviewDetail, ReviewSubmissionResult } from '~types/learningPath'
import { learningApi } from '../api'
import { ApiError } from '../api/apiError'
import { ReviewPage } from './ReviewPage'

vi.mock('../api', async () => ({
  ...await import('../api/apiError'),
  learningApi: {
    getReview: vi.fn(), listTopics: vi.fn(), getHearts: vi.fn(), submitReview: vi.fn(), submitTheoryCheck: vi.fn(),
    getDiagnostic: vi.fn(), skipDiagnostic: vi.fn(),
  },
}))
vi.mock('@/features/study-time/StudyActivityTracker', () => ({ StudyActivityTracker: () => null }))

const base: ReviewDetail = {
  reviewId: 'rev-1', topicId: 'topic-1', status: 'PENDING', stage: 'PRACTICE',
  knowledgePoint: { code: 'PASSIVE', title: 'Câu bị động' },
  sourceLessonTitle: 'Bài học trước', theory: [], set: null,
  failedSets: 2, maxFailedSets: 4, theoryReason: null, resumeLessonId: 'lesson-1',
}

const diagnosing: ReviewDetail = { ...base, state: 'DIAGNOSING', diagnosticSessionId: 'session-1' }

function diagnostic(statuses: Array<'OPEN' | 'ANSWERED'>): Diagnostic {
  return {
    sessionId: 'session-1', rootReviewId: 'rev-1', status: 'PROBING', conclusion: [], waitingOnReviewIds: [],
    probes: statuses.map((status, index) => ({
      probeId: `probe-${index + 1}`,
      knowledgePoint: { knowledgePointId: `kp-${index + 1}`, code: `KP${index + 1}`, name: `Kiến thức nền ${index + 1}` },
      depth: 1, status,
      correct: status === 'ANSWERED' ? 1 : null, total: status === 'ANSWERED' ? 3 : null,
      result: status === 'ANSWERED' ? 'FAILED' : null,
    })),
  }
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

describe('ReviewPage prerequisite diagnosis', () => {
  it('lists the probes and offers the open ones, with the skip button off until one is answered', async () => {
    vi.mocked(learningApi.getDiagnostic).mockResolvedValue(diagnostic(['OPEN', 'OPEN']))
    renderReview(diagnosing)

    expect(await screen.findByRole('heading', { name: 'Kiểm tra kiến thức nền' })).toBeInTheDocument()
    expect(screen.getByText('Kiến thức nền 1')).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: /Làm bài/ })
    expect(links[0]).toHaveAttribute('href', '/learn/reviews/rev-1/diagnostics/session-1/probes/probe-1')
    expect(screen.getByRole('button', { name: 'Bỏ qua kiểm tra' })).toBeDisabled()
  })

  it('skips after one probe is answered, once the learner confirms, and reloads the review', async () => {
    vi.mocked(learningApi.getDiagnostic).mockResolvedValue(diagnostic(['ANSWERED', 'OPEN']))
    vi.mocked(learningApi.skipDiagnostic).mockResolvedValue({ ...diagnostic(['ANSWERED', 'OPEN']), status: 'CONCLUDED' })
    renderReview(diagnosing)

    const skip = await screen.findByRole('button', { name: 'Bỏ qua kiểm tra' })
    expect(skip).toBeEnabled()
    expect(screen.getByText('Chưa đạt (1/3 câu)')).toBeInTheDocument()
    await userEvent.click(skip)
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bỏ qua' }))

    await waitFor(() => expect(learningApi.skipDiagnostic).toHaveBeenCalledWith('session-1'))
    await waitFor(() => expect(learningApi.getReview).toHaveBeenCalledTimes(2))
  })

  it('does not skip when the learner cancels the confirmation', async () => {
    vi.mocked(learningApi.getDiagnostic).mockResolvedValue(diagnostic(['ANSWERED', 'OPEN']))
    renderReview(diagnosing)

    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ qua kiểm tra' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Hủy' }))

    expect(learningApi.skipDiagnostic).not.toHaveBeenCalled()
  })

  it('tells the learner when the server refuses the skip', async () => {
    vi.mocked(learningApi.getDiagnostic).mockResolvedValue(diagnostic(['ANSWERED', 'OPEN']))
    vi.mocked(learningApi.skipDiagnostic).mockRejectedValue(
      new ApiError(409, 'DIAGNOSIS_PROBE_REQUIRED', 'Diagnosis needs a probe'),
    )
    renderReview(diagnosing)

    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ qua kiểm tra' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ qua' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Hãy làm ít nhất một bài kiểm tra nền')
  })

  it('links to the reviews a review waits for', async () => {
    vi.mocked(learningApi.getDiagnostic).mockResolvedValue({
      ...diagnostic(['ANSWERED']), status: 'CONCLUDED',
      conclusion: [{ knowledgePointId: 'kp-1', code: 'KP1', name: 'Phân từ quá khứ' }],
    })
    renderReview({ ...base, state: 'WAITING_ON_PREREQUISITES', diagnosticSessionId: 'session-1', waitingOnReviewIds: ['rev-gap'] })

    expect(await screen.findByRole('heading', { name: 'Cần ôn trước' })).toBeInTheDocument()
    expect(await screen.findByText(/Phân từ quá khứ/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Làm bài ôn/ })).toHaveAttribute('href', '/learn/reviews/rev-gap')
  })

  it('keeps the probes open as an optional check when the review was skipped for lack of a set', async () => {
    vi.mocked(learningApi.getDiagnostic).mockResolvedValue(diagnostic(['OPEN', 'OPEN']))
    renderReview({ ...base, status: 'SKIPPED', state: 'ACTIVE', diagnosticSessionId: 'session-1' })

    expect(await screen.findByRole('heading', { name: 'Kiểm tra kiến thức nền' })).toBeInTheDocument()
    expect(screen.getByText(/chưa có bộ câu hỏi mới/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Làm bài/ })[0])
      .toHaveAttribute('href', '/learn/reviews/rev-1/diagnostics/session-1/probes/probe-1')
    expect(screen.getByRole('heading', { name: 'Đã bỏ qua bài ôn' })).toBeInTheDocument()
  })

  it('drops the probes of a skipped review once the learner skips the rest of the diagnosis', async () => {
    const concluded: Diagnostic = { ...diagnostic(['ANSWERED', 'OPEN']), status: 'CONCLUDED' }
    vi.mocked(learningApi.getDiagnostic)
      .mockResolvedValueOnce(diagnostic(['ANSWERED', 'OPEN']))
      .mockResolvedValue(concluded)
    vi.mocked(learningApi.skipDiagnostic).mockResolvedValue(concluded)
    renderReview({ ...base, status: 'SKIPPED', state: 'ACTIVE', diagnosticSessionId: 'session-1' })

    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ qua kiểm tra' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ qua' }))

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Kiểm tra kiến thức nền' })).not.toBeInTheDocument())
  })

  it('shows no diagnosis block for a skipped review whose diagnosis has concluded', async () => {
    vi.mocked(learningApi.getDiagnostic).mockResolvedValue({ ...diagnostic(['ANSWERED']), status: 'CONCLUDED' })
    renderReview({ ...base, status: 'SKIPPED', state: 'ACTIVE', diagnosticSessionId: 'session-1' })

    await screen.findByRole('heading', { name: 'Đã bỏ qua bài ôn' })
    await waitFor(() => expect(learningApi.getDiagnostic).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Kiểm tra kiến thức nền' })).not.toBeInTheDocument()
  })

  it('shows no diagnosis block for an ordinary review', async () => {
    renderReview({ ...base, state: 'ACTIVE' })

    await screen.findByRole('heading', { name: 'Câu bị động', level: 1 })
    expect(screen.queryByRole('heading', { name: 'Kiểm tra kiến thức nền' })).not.toBeInTheDocument()
    expect(learningApi.getDiagnostic).not.toHaveBeenCalled()
  })
})

describe('ReviewPage failed sets and the move to the basket', () => {
  const withSet: ReviewDetail = {
    ...base, failedSets: 3, maxFailedSets: 4,
    set: {
      setId: 'set-4', packageCode: 'PS-4', attemptNumber: 4, maxAttempts: 4, passage: { title: '', paragraphs: [] }, audio: null,
      questions: [{ id: 'q1', number: 1, prompt: 'Chọn đáp án đúng.', options: [{ value: 'A', label: 'Phương án A' }, { value: 'B', label: 'Phương án B' }] }],
    },
  }

  it('shows the failed sets against the limit of a blocking review, and without one for an optional review', async () => {
    const { unmount } = renderReview(withSet)
    expect(await screen.findByText('Số bộ chưa đạt: 3/4.')).toBeInTheDocument()
    unmount()

    renderReview({ ...withSet, blocking: false, maxFailedSets: null })
    expect(await screen.findByText('Số bộ chưa đạt: 3.')).toBeInTheDocument()
  })

  async function failTheSet(outcome: Partial<ReviewSubmissionResult>) {
    vi.mocked(learningApi.submitReview).mockResolvedValue({
      status: 'PENDING', stage: 'PRACTICE', passed: false, correctCount: 0, totalCount: 1, percent: 0, failedSets: 4,
      results: [{ questionId: 'q1', correct: false, hint: null }], resumeLessonId: 'lesson-1', topicId: 'topic-1',
      gamification: null, blocking: true, ...outcome,
    })
    renderReview(withSet)
    await userEvent.click(await screen.findByRole('radio', { name: /Phương án A/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Nộp' }))
  }

  it('says the review moved to the basket when the failed set unblocks it', async () => {
    await failTheSet({ blocking: false })

    expect(await screen.findByText(/đã chuyển vào giỏ ôn, bạn có thể học tiếp/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mở giỏ ôn' })).toHaveAttribute('href', '/learn/review-basket')
    expect(screen.queryByRole('button', { name: 'Làm bộ tiếp theo' })).not.toBeInTheDocument()
  })

  it('offers the next set while the failed set leaves the review blocking, or does not say', async () => {
    await failTheSet({ blocking: null })

    expect(await screen.findByRole('button', { name: 'Làm bộ tiếp theo' })).toBeInTheDocument()
    expect(screen.queryByText(/đã chuyển vào giỏ ôn/)).not.toBeInTheDocument()
  })
})

describe('ReviewPage without a lesson', () => {
  it('explains that no lesson teaches the point instead of showing theory', async () => {
    renderReview({ ...base, state: 'ACTIVE', theoryScope: 'NO_LESSON', failedSets: 0 })

    expect(await screen.findByText(/chưa có bài học trong lộ trình của bạn/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Lý thuyết cần nhớ' })).not.toBeInTheDocument()
  })
})
