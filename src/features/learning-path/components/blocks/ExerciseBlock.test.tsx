import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseBlockData, QuestionResult } from '~types/learningPath'
import { ExerciseBlock, type GradedOutcome } from './ExerciseBlock'

const toast = vi.fn()
vi.mock('@/components/toast/toastContext', () => ({ useToast: () => ({ toast }) }))

const options = [{ value: 'A', label: 'One' }, { value: 'B', label: 'Two' }, { value: 'C', label: 'Three' }]
const block: ExerciseBlockData = {
  id: 'block-1', sortOrder: 1, type: 'EXERCISE', title: 'Paragraphs', instructions: 'Pick one.', knowledgePointCode: 'KP',
  state: 'NOT_ATTEMPTED', savedAnswers: null, solutions: null,
  questions: [
    { id: 'q1', number: 1, prompt: 'First?', options, hint: null },
    { id: 'q2', number: 2, prompt: 'Second?', options, hint: null },
    { id: 'q3', number: 3, prompt: 'Third?', options, hint: null },
  ],
}

function outcome(passed: boolean, results: QuestionResult[]): GradedOutcome {
  const correctCount = results.filter((result) => result.correct).length
  return { passed, correctCount, totalCount: results.length, percent: Math.round((correctCount / results.length) * 100), results }
}

async function answerAndSubmit(user: ReturnType<typeof userEvent.setup>, picks: string[]) {
  const questions = screen.getAllByRole('listitem')
  for (const [index, label] of picks.entries()) await user.click(within(questions[index]!).getByText(label))
  await user.click(screen.getByRole('button', { name: 'Nộp' }))
}

beforeEach(() => { toast.mockReset() })

describe('ExerciseBlock verdict', () => {
  it('marks each question right or wrong after a block that is not passed, without the answers, and keeps the toast to the score', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(outcome(false, [
      { questionId: 'q1', correct: true },
      { questionId: 'q2', correct: false },
      { questionId: 'q3', correct: false },
    ]))
    render(<ExerciseBlock block={block} onSubmit={onSubmit} />)
    await answerAndSubmit(user, ['One', 'Two', 'Three'])

    const items = await waitFor(() => {
      const rows = screen.getAllByRole('listitem')
      expect(within(rows[0]!).getByText('Bạn trả lời đúng')).toBeInTheDocument()
      return rows
    })
    expect(within(items[1]!).getByText('Bạn trả lời sai')).toBeInTheDocument()
    expect(within(items[2]!).getByText('Bạn trả lời sai')).toBeInTheDocument()
    expect(screen.queryByText('Đáp án:')).not.toBeInTheDocument()

    const shown = toast.mock.calls[0]![0] as { title: string; description: string }
    expect(shown.title).toBe('Chưa đạt: 1/3 câu đúng')
    expect(shown.description).not.toMatch(/Sai: câu/)
    expect(shown.description).toMatch(/Sửa các câu sai rồi nộp lại/)
  })

  it('marks the wrong answers of a passed block and shows the right option and the explanation', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(outcome(true, [
      { questionId: 'q1', correct: true, correctAnswer: 'A', explanation: 'First.' },
      { questionId: 'q2', correct: true, correctAnswer: 'B', explanation: 'Second.' },
      { questionId: 'q3', correct: false, correctAnswer: 'A', explanation: 'Third.' },
    ]))
    render(<ExerciseBlock block={block} onSubmit={onSubmit} />)
    await answerAndSubmit(user, ['One', 'Two', 'Three'])

    const rows = await waitFor(() => {
      const found = screen.getAllByRole('listitem')
      expect(within(found[2]!).getByText('Bạn trả lời sai')).toBeInTheDocument()
      return found
    })
    expect(within(rows[0]!).getByText('Bạn trả lời đúng')).toBeInTheDocument()
    expect(within(rows[2]!).getByText('One').closest('label')).toHaveAttribute('data-verdict', 'correct')
    expect(within(rows[2]!).getByText('Three').closest('label')).toHaveAttribute('data-verdict', 'wrong')
    expect(within(rows[2]!).getByText('Third.')).toBeInTheDocument()
    expect(toast.mock.calls[0]![0]).toMatchObject({ title: 'Đã đạt: 2/3 câu đúng' })
  })

  it('takes the mark off a question as soon as its answer is changed', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(outcome(false, [
      { questionId: 'q1', correct: false },
      { questionId: 'q2', correct: false },
      { questionId: 'q3', correct: false },
    ]))
    render(<ExerciseBlock block={block} onSubmit={onSubmit} />)
    await answerAndSubmit(user, ['One', 'One', 'One'])
    await waitFor(() => expect(screen.getAllByText('Bạn trả lời sai')).toHaveLength(3))

    await user.click(within(screen.getAllByRole('listitem')[1]!).getByText('Two'))

    expect(screen.getAllByText('Bạn trả lời sai')).toHaveLength(2)
    expect(within(screen.getAllByRole('listitem')[1]!).queryByText('Bạn trả lời sai')).not.toBeInTheDocument()
  })
})
