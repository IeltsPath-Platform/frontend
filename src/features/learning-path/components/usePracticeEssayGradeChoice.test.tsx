import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GradingTerms } from '@/features/practice/writing/writingApi'
import { usePracticeEssayGradeChoice } from './usePracticeEssayGradeChoice'

const api = vi.hoisted(() => ({ terms: vi.fn(), access: vi.fn(), submit: vi.fn(), ai: vi.fn(), sent: vi.fn() }))
vi.mock('@/features/practice/writing/writingApi', () => ({ getGradingTerms: api.terms }))
vi.mock('@/features/practice/writing/useWritingWallet', () => ({ useWritingWallet: () => ({ checkAccess: api.access }) }))
vi.mock('../api', () => ({
  learningApi: { submitPracticeEssayToExaminer: api.submit },
  toApiError: (error: unknown) => error,
  userMessage: () => 'Không gửi được bài.',
}))
vi.mock('@/features/practice/writing/ExaminerPickDialog', () => ({
  ExaminerPickDialog: ({ minWords }: { minWords: number }) => <p>Ít nhất {minWords} từ</p>,
}))

const SERVER_TERMS: GradingTerms = { pointCost: 11, minWords: 75, maxWords: 1200 }

function Harness() {
  const choice = usePracticeEssayGradeChoice({
    attemptId: 'attempt', questionVersionId: 'question', essayText: 'Bài viết còn nguyên.', words: 100,
    context: 'Luyện tập bài học', onAi: api.ai, onSent: api.sent,
  })
  return <><textarea aria-label="Bài viết" defaultValue="Bài viết còn nguyên." /><button onClick={choice.open}>Nộp để chấm</button>{choice.dialogs}</>
}

describe('Practice essay grading terms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.terms.mockReset().mockResolvedValue(SERVER_TERMS)
    api.access.mockResolvedValue({ balance: 30, subscription: undefined })
  })

  it('disables both choices without guessed terms after a terms failure, and retains the essay', async () => {
    api.terms.mockRejectedValue(new Error('terms unavailable'))
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Nộp để chấm' }))

    const dialog = await screen.findByRole('dialog', { name: 'Chọn cách chấm bài' })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Chưa tải được điều khoản chấm.')
    const ai = within(dialog).getByRole('button', { name: 'Chấm bằng AI' })
    expect(ai).toBeDisabled()
    expect(ai).toHaveAccessibleDescription(/Thử lại để chọn cách chấm bài/)
    expect(within(dialog).getByRole('button', { name: 'Chọn giáo viên' })).toBeDisabled()
    expect(within(dialog).queryByText(/\d+ point/)).not.toBeInTheDocument()
    await userEvent.click(ai)
    expect(api.ai).not.toHaveBeenCalled()
    expect(api.submit).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }))
    expect(screen.getByRole('textbox', { name: 'Bài viết' })).toHaveValue('Bài viết còn nguyên.')
  })

  it('fetches terms again on retry and uses the returned price before AI can be chosen', async () => {
    api.terms.mockRejectedValueOnce(new Error('terms unavailable')).mockResolvedValue(SERVER_TERMS)
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Nộp để chấm' }))
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    const ai = await screen.findByRole('button', { name: 'Chấm bằng AI · 11 point' })
    expect(api.terms).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Chi phí 11 point · số dư 30 point')).toBeInTheDocument()
    await userEvent.click(ai)
    expect(api.ai).toHaveBeenCalledTimes(1)
  })

  it('keeps AI disabled while terms are loading and passes the server minimum to the examiner picker', async () => {
    let resolveTerms!: (value: GradingTerms) => void
    api.terms.mockReturnValue(new Promise<GradingTerms>((resolve) => { resolveTerms = resolve }))
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Nộp để chấm' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Đang tải điều khoản chấm…')
    expect(screen.getByRole('button', { name: 'Chấm bằng AI' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeDisabled()

    await act(async () => resolveTerms(SERVER_TERMS))
    await userEvent.click(await screen.findByRole('button', { name: 'Chọn giáo viên' }))
    await waitFor(() => expect(screen.getByText('Ít nhất 75 từ')).toBeInTheDocument())
    expect(api.submit).not.toHaveBeenCalled()
  })
})
