import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PracticeEssay } from '~types/learningPath'
import { PracticeEssays } from './PracticeEssays'

const { submitPracticeEssay, submitPracticeEssayToExaminer, getWritingSubmission } = vi.hoisted(() => ({
  submitPracticeEssay: vi.fn(), submitPracticeEssayToExaminer: vi.fn(), getWritingSubmission: vi.fn(),
}))

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  learningApi: { submitPracticeEssay, submitPracticeEssayToExaminer, getWritingSubmission },
}))

vi.mock('@/features/practice/writing/useExaminerChoices', () => ({
  useExaminerChoices: () => ({
    status: 'ready',
    examiners: [{ id: 'examiner-1', displayName: 'Examiner 1', avatarUrl: null, bio: null, ieltsBand: 8, certificates: [], acceptingSubmissions: true }],
    full: new Set<string>(),
    backlog: new Set<string>(),
  }),
}))

const essay: PracticeEssay = {
  id: 'question-1',
  number: 1,
  prompt: 'The bar chart shows the percentage of households that owned a car.',
  task: 'TASK_1',
  minWords: 150,
  passBand: 5.5,
  latest: null,
}

/** Long enough for the server's essay limit, so the teacher button is open. */
const TEXT = Array.from({ length: 60 }, (_, index) => `word${index}`).join(' ')

function renderEssays(essays: PracticeEssay[] = [essay]) {
  const onFinish = vi.fn().mockResolvedValue(undefined)
  render(<MemoryRouter><PracticeEssays attemptId="attempt-1" essays={essays} finished={false} onExit={vi.fn()} onFinish={onFinish} /></MemoryRouter>)
  return onFinish
}

async function chooseTeacher() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Introduction' }), { target: { value: TEXT } })
  await userEvent.click(screen.getByRole('button', { name: 'Nộp để chấm' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Chọn giáo viên' }))
  await userEvent.click(await screen.findByRole('radio', { name: /Examiner 1/ }))
}

describe('a Practice essay of a course lesson: who grades it', () => {
  beforeEach(() => {
    submitPracticeEssay.mockReset()
    submitPracticeEssayToExaminer.mockReset()
    getWritingSubmission.mockReset()
  })

  it('asks who grades the essay before anything is sent: a teacher or the AI', async () => {
    renderEssays()
    fireEvent.change(screen.getByRole('textbox', { name: 'Introduction' }), { target: { value: TEXT } })

    await userEvent.click(screen.getByRole('button', { name: 'Nộp để chấm' }))

    const dialog = await screen.findByRole('dialog', { name: 'Chọn cách chấm bài' })
    expect(within(dialog).getByRole('region', { name: 'Giáo viên chấm' })).toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'AI chấm' })).toBeInTheDocument()
    expect(within(dialog).getByText('Đề viết · Task 1 · Luyện tập bài học')).toBeInTheDocument()
    expect(submitPracticeEssay).not.toHaveBeenCalled()
    expect(submitPracticeEssayToExaminer).not.toHaveBeenCalled()
  })

  it('sends the essay to the chosen teacher instead of the AI, locks it, and points to where its grade will be', async () => {
    submitPracticeEssayToExaminer.mockResolvedValue({ submissionId: 'submission-9', status: 'AWAITING_EXAMINER' })
    renderEssays()

    await chooseTeacher()
    await userEvent.click(screen.getByRole('button', { name: /Gửi cho Examiner 1/ }))

    expect(submitPracticeEssayToExaminer).toHaveBeenCalledWith('attempt-1', 'question-1', expect.objectContaining({
      essayText: TEXT, examinerId: 'examiner-1',
    }))
    expect(submitPracticeEssay).not.toHaveBeenCalled()
    expect(await screen.findByText('Đã gửi giáo viên chấm')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem bài đã gửi' })).toHaveAttribute('href', '/practice/writing/submissions/submission-9/result')
    expect(screen.getByRole('textbox', { name: 'Introduction' })).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Nộp để chấm' })).not.toBeInTheDocument()
    // The set is not handed in here: the teacher's grade is what counts for this essay.
    expect(screen.queryByRole('button', { name: 'Hoàn thành bộ luyện tập' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem bài giáo viên chấm' })).toHaveAttribute('href', '/writing-reviews')
  })

  it('says why the teacher could not take the essay and leaves it to be sent again', async () => {
    const { ApiError } = await import('../api')
    submitPracticeEssayToExaminer.mockRejectedValueOnce(new ApiError(402, 'HUMAN_GRADING_CREDIT_REQUIRED', 'No credit'))
    renderEssays()

    await chooseTeacher()
    await userEvent.click(screen.getByRole('button', { name: /Gửi cho Examiner 1/ }))

    expect(await screen.findByText('Gói Premium của bạn đã hết lượt giáo viên chấm, hoặc đã hết hạn.')).toBeInTheDocument()
    expect(screen.queryByText('Đã gửi giáo viên chấm')).not.toBeInTheDocument()
    // The dialog stays open for another try; the essay behind it is still editable.
    expect(screen.getByRole('textbox', { name: 'Introduction', hidden: true })).not.toHaveAttribute('readonly')
  })

  it('keeps one request id for the same text, so a resend continues the same essay', async () => {
    const { ApiError } = await import('../api')
    submitPracticeEssayToExaminer
      .mockRejectedValueOnce(new ApiError(409, 'EXAMINER_UNAVAILABLE', 'Full'))
      .mockResolvedValueOnce({ submissionId: 'submission-9', status: 'AWAITING_EXAMINER' })
    renderEssays()

    await chooseTeacher()
    await userEvent.click(screen.getByRole('button', { name: /Gửi cho Examiner 1/ }))
    expect(await screen.findByText(/Hãy chọn giáo viên khác/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Gửi cho Examiner 1/ }))

    await screen.findByText('Đã gửi giáo viên chấm')
    const ids = submitPracticeEssayToExaminer.mock.calls.map((call) => call[2].requestId)
    expect(ids[0]).toBe(ids[1])
  })

  it('shows an essay sent on an earlier visit as waiting for its teacher, read-only', async () => {
    getWritingSubmission.mockResolvedValue({ submissionId: 'submission-7', status: 'AWAITING_EXAMINER', wordCount: 60, essayText: 'My essay sent earlier.' })
    renderEssays([{ ...essay, latest: { id: 'submission-7', status: 'AWAITING_EXAMINER', overallBand: null, passed: null } }])

    expect(await screen.findByDisplayValue('My essay sent earlier.')).toHaveAttribute('readonly')
    expect(screen.getByText('Đã gửi giáo viên chấm')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem bài đã gửi' })).toHaveAttribute('href', '/practice/writing/submissions/submission-7/result')
    expect(screen.queryByRole('button', { name: 'Nộp để chấm' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hoàn thành bộ luyện tập' })).not.toBeInTheDocument()
  })
})
