import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/toast/ToastProvider'
import type { DiagnosticProbe, DiagnosticProbeSubmission } from '~types/learningPath'
import { learningApi } from '../api'
import { ApiError } from '../api/apiError'
import { DiagnosticProbePage } from './DiagnosticProbePage'

vi.mock('../api', async () => ({
  ...await import('../api/apiError'),
  learningApi: { getDiagnosticProbe: vi.fn(), submitDiagnosticProbe: vi.fn(), listTopics: vi.fn(), getHearts: vi.fn() },
}))

const open: DiagnosticProbe = {
  sessionId: 'session-1', probeId: 'probe-1', knowledgePointId: 'kp-1', status: 'OPEN',
  passage: { title: '', paragraphs: [] }, audio: null,
  questions: [{ id: 'q1', number: 1, prompt: 'Chọn đáp án đúng.', options: [{ value: 'A', label: 'Phương án A' }, { value: 'B', label: 'Phương án B' }] }],
}

const submission: DiagnosticProbeSubmission = {
  probeId: 'probe-1', passed: false, correct: 0, total: 1, sessionStatus: 'PROBING',
  results: [{ questionId: 'q1', correct: false, correctAnswer: 'B', explanation: 'Vì B đúng.', hint: null }],
}

function renderProbe() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/learn/reviews/rev-1/diagnostics/session-1/probes/probe-1']}>
        <Routes>
          <Route path="/learn/reviews/:reviewId/diagnostics/:sessionId/probes/:probeId" element={<DiagnosticProbePage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
}

async function answer() {
  await userEvent.click(await screen.findByRole('radio', { name: /Phương án A/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Nộp' }))
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('ResizeObserver', class { observe() {}; disconnect() {}; unobserve() {} })
})

describe('DiagnosticProbePage', () => {
  it('submits the answers once and offers the way back to the review', async () => {
    vi.mocked(learningApi.getDiagnosticProbe).mockResolvedValue(open)
    vi.mocked(learningApi.submitDiagnosticProbe).mockResolvedValue(submission)
    renderProbe()

    await answer()

    await waitFor(() => expect(learningApi.submitDiagnosticProbe).toHaveBeenCalledTimes(1))
    const [sessionId, probeId, request] = vi.mocked(learningApi.submitDiagnosticProbe).mock.calls[0]
    expect(sessionId).toBe('session-1')
    expect(probeId).toBe('probe-1')
    expect(request.answers).toEqual([{ questionId: 'q1', answer: 'A' }])
    expect(request.requestId).toBeTruthy()
    expect(await screen.findByRole('link', { name: /Quay lại bài ôn/ })).toHaveAttribute('href', '/learn/reviews/rev-1')
  })

  it('says the diagnosis concluded once the last probe is answered', async () => {
    vi.mocked(learningApi.getDiagnosticProbe).mockResolvedValue(open)
    vi.mocked(learningApi.submitDiagnosticProbe).mockResolvedValue({ ...submission, sessionStatus: 'CONCLUDED' })
    renderProbe()

    await answer()

    expect(await screen.findByText(/Đã có kết luận từ các bài kiểm tra/)).toBeInTheDocument()
  })

  it('shows no questions for a probe that is no longer open', async () => {
    vi.mocked(learningApi.getDiagnosticProbe).mockResolvedValue({ ...open, status: 'ANSWERED', questions: [] })
    renderProbe()

    expect(await screen.findByText('Bài kiểm tra này không còn mở')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về bài ôn' })).toHaveAttribute('href', '/learn/reviews/rev-1')
    expect(screen.queryByRole('button', { name: 'Nộp' })).not.toBeInTheDocument()
  })

  it('reloads the probe when the server reports it closed', async () => {
    vi.mocked(learningApi.getDiagnosticProbe).mockResolvedValue(open)
    vi.mocked(learningApi.submitDiagnosticProbe).mockRejectedValue(new ApiError(409, 'PROBE_CLOSED', 'closed'))
    renderProbe()

    await answer()

    await waitFor(() => expect(learningApi.getDiagnosticProbe).toHaveBeenCalledTimes(2))
  })
})
