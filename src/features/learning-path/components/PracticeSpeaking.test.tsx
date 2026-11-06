import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HttpError } from '@/lib/httpClient'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PracticeRecorded } from '~types/learningPath'
import { PracticeSpeaking } from './PracticeSpeaking'

const wallet = vi.hoisted(() => ({ checkAccess: vi.fn() }))
const sender = vi.hoisted(() => ({ send: vi.fn() }))
const api = vi.hoisted(() => ({ getSpeakingTerms: vi.fn(), getSpeakingSubmission: vi.fn(), settleSpeakingSubmission: vi.fn() }))

vi.mock('@/features/practice/speaking/speakingPracticeApi', () => api)
vi.mock('@/features/practice/speaking/sendSpeakingSubmission', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/practice/speaking/sendSpeakingSubmission')>()),
  sendSpeakingSubmission: sender.send,
}))
vi.mock('@/features/practice/writing/useWritingWallet', () => ({
  useWritingWallet: () => ({ client: undefined, isLoggedIn: true, balance: null, error: '', check: () => Promise.resolve(2), checkAccess: wallet.checkAccess, onActivated: vi.fn() }),
}))
// The studio needs a microphone: a button stands in for it and hands over a finished recording.
vi.mock('@/features/practice/speaking/SpeakingRecorder', () => ({
  SpeakingRecorder: ({ saved, onSaved }: { saved?: unknown; onSaved?: (recording: unknown) => void }) => (
    <div>
      <p>{saved ? 'Đã ghi' : 'Chưa ghi'}</p>
      <button onClick={() => onSaved?.({ blob: new Blob(['x']), durationSeconds: 30, silent: false, inputName: 'Mic' })} type="button">Ghi thử</button>
    </div>
  ),
}))
vi.mock('@/features/practice/speaking/SpeakingWaitingPanel', () => ({
  SpeakingWaitingPanel: ({ status }: { status?: string }) => <p>Đang chờ: {status ?? 'tải'}</p>,
}))

const item = (overrides: Partial<PracticeRecorded> = {}): PracticeRecorded => ({
  id: 'q1', number: 1, prompt: 'Describe what you usually do at weekends.', durationSeconds: 60, passBand: 5.5, latest: null, ...overrides,
})

function show(props: Partial<React.ComponentProps<typeof PracticeSpeaking>> = {}) {
  const onFinish = vi.fn().mockResolvedValue(undefined)
  render(
    <MemoryRouter>
      <PracticeSpeaking attemptId="attempt-1" finished={false} onFinish={onFinish} recorded={[item()]}
        title="Nói Part 1" {...props} />
    </MemoryRouter>,
  )
  return { onFinish }
}

const graded = (overallBand: number) => ({ id: 'sub-1', status: 'GRADED', result: { overallBand, criteria: [] } })

describe('the recorded answer of a lesson practice set', () => {
  beforeEach(() => {
    sender.send.mockReset()
    wallet.checkAccess.mockReset().mockResolvedValue({ balance: 12, subscription: null })
    api.getSpeakingTerms.mockReset().mockRejectedValue(new Error('terms unavailable'))
    api.getSpeakingSubmission.mockReset()
    api.settleSpeakingSubmission.mockReset()
  })

  it('shows the prompt and cannot be sent before the learner has recorded', () => {
    show()

    expect(screen.getByText('Describe what you usually do at weekends.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gửi chấm bài nói' })).toBeDisabled()
    expect(screen.getByText('Ghi âm câu trả lời trước khi gửi chấm.')).toBeInTheDocument()
  })

  it('asks AI or teacher, sends the recording to the attempt, then follows the grading in place', async () => {
    sender.send.mockResolvedValue({ id: 'sub-1' })
    api.getSpeakingSubmission.mockResolvedValue({ id: 'sub-1', status: 'GRADING' })
    show()
    await userEvent.click(screen.getByRole('button', { name: 'Ghi thử' }))

    await userEvent.click(screen.getByRole('button', { name: 'Gửi chấm bài nói' }))
    const method = await screen.findByRole('dialog')
    expect(within(method).getByRole('button', { name: 'Chọn giáo viên' })).toBeDisabled()
    await userEvent.click(within(method).getByRole('button', { name: /Chấm bằng AI/ }))
    const confirm = await screen.findByRole('dialog')
    await userEvent.click(within(confirm).getByRole('checkbox'))
    await userEvent.click(within(confirm).getByRole('button', { name: /Chấm bài · \d+ point/ }))

    expect(await screen.findByText('Đang chờ: GRADING')).toBeInTheDocument()
    const input = sender.send.mock.calls[0][0]
    expect(input.attemptId).toBe('attempt-1')
    expect(input.packageVersionId).toBeUndefined()
    expect(input.recordings.map((entry: { questionVersionId: string; label: string }) => [entry.questionVersionId, entry.label]))
      .toEqual([['q1', 'Câu 1']])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the result in place once the answer is graded and hands the set in by itself, with no button for it', async () => {
    api.getSpeakingSubmission.mockResolvedValue(graded(6.5))
    const { onFinish } = show({ recorded: [item({ latest: { id: 'sub-1', status: 'PAYMENT_PENDING', overallBand: null, passed: null } })] })
    api.settleSpeakingSubmission.mockResolvedValue(graded(6.5))

    expect(await screen.findByText(/Band ước lượng/)).toHaveTextContent('6.5')
    expect(screen.getByText(/Đạt/)).toBeInTheDocument()
    // The detailed result is part of the page: no link to open it somewhere else.
    expect(screen.queryByRole('link', { name: 'Xem nhận xét chi tiết' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hoàn thành bộ luyện tập' })).not.toBeInTheDocument()
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
  })

  it('says a band under the pass band is not a pass, and still hands the set in', async () => {
    api.getSpeakingSubmission.mockResolvedValue(graded(4.5))
    const { onFinish } = show({ recorded: [item({ latest: { id: 'sub-1', status: 'GRADED', overallBand: 4.5, passed: false } })] })

    expect(await screen.findByText(/Chưa đạt/)).toBeInTheDocument()
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
  })

  it('shows what the server refuses when the set cannot be handed in, and tries again on request', async () => {
    api.getSpeakingSubmission.mockResolvedValue(graded(6))
    const { onFinish } = show({ recorded: [item({ latest: { id: 'sub-1', status: 'GRADED', overallBand: 6, passed: true } })] })
    onFinish.mockRejectedValueOnce(new HttpError(409, 'Record first', { code: 'SPEAKING_NOT_GRADED', detail: 'Hãy ghi âm và đợi bài nói được chấm xong.' }, 'SPEAKING_NOT_GRADED'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Hãy ghi âm và đợi bài nói được chấm xong.')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers to record again when the answer ended without a grade, and costs nothing', async () => {
    api.getSpeakingSubmission.mockResolvedValue({ id: 'sub-1', status: 'ABANDONED' })
    show({ recorded: [item({ latest: { id: 'sub-1', status: 'QUEUED', overallBand: null, passed: null } })] })

    expect(await screen.findByText(/không bị trừ point/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ghi âm lại' }))

    expect(screen.getByRole('button', { name: 'Gửi chấm bài nói' })).toBeDisabled()
    expect(screen.queryByText(/không bị trừ point/)).not.toBeInTheDocument()
  })

  it('does not wait for an answer whose file was never sent, and lets the learner record again', () => {
    show({ recorded: [item({ latest: { id: 'sub-1', status: 'UPLOADING', overallBand: null, passed: null } })] })

    expect(screen.getByRole('button', { name: 'Gửi chấm bài nói' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Ghi thử' })).toBeInTheDocument()
    expect(api.getSpeakingSubmission).not.toHaveBeenCalled()
    expect(screen.queryByText(/Đang chờ/)).not.toBeInTheDocument()
  })

  it('shows the done message instead of the finish button once the set was handed in', async () => {
    api.getSpeakingSubmission.mockResolvedValue(graded(6.5))
    show({
      finished: true,
      done: <p>Bài nói đạt. Bộ luyện tập đã được ghi nhận.</p>,
      recorded: [item({ latest: { id: 'sub-1', status: 'GRADED', overallBand: 6.5, passed: true } })],
    })

    expect(await screen.findByText('Bài nói đạt. Bộ luyện tập đã được ghi nhận.')).toBeInTheDocument()
  })
})
