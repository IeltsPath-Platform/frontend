import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EssayGrade, PracticeEssay } from '~types/learningPath'
import { PracticeEssays } from './PracticeEssays'

const { submitPracticeEssay } = vi.hoisted(() => ({ submitPracticeEssay: vi.fn() }))

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  learningApi: { submitPracticeEssay },
}))

const SAMPLE = [
  'The chart compares the **car ownership rate** in four countries.',
  'Overall, ownership rose in three countries.',
  'Country D led in 2000 and A **recorded a rise** by 2020.',
  '**By comparison**, B and C began lower.',
].join('\n\n')

const essay: PracticeEssay = {
  id: 'essay-1',
  number: 1,
  prompt: 'The bar chart shows car ownership in four countries.',
  task: 'TASK_1',
  minWords: 5,
  passBand: 5.5,
  latest: null,
}

const grade: EssayGrade = {
  submissionId: 'submission-1',
  status: 'GRADED',
  wordCount: 6,
  overallBand: 6,
  passed: true,
  criteria: [{ code: 'TA', band: 6, strengths: ['Clear overview'], improvements: [] }],
  corrections: [],
  summary: 'A clear report.',
  pointsCharged: 3,
  sampleAnswer: null,
}

function renderEssay(item: PracticeEssay) {
  render(<PracticeEssays attemptId="attempt-1" essays={[item]} finished={false} onExit={vi.fn()} onFinish={vi.fn()} />)
}

describe('PracticeEssays sample answer switch', () => {
  beforeEach(() => {
    submitPracticeEssay.mockReset()
  })

  it('offers no switch when the essay has no sample', () => {
    renderEssay(essay)
    expect(screen.queryByRole('switch', { name: 'Bài mẫu' })).not.toBeInTheDocument()
  })

  it('keeps the editor in view until the learner switches the sample on', () => {
    renderEssay({ ...essay, sampleAnswer: SAMPLE })
    const toggle = screen.getByRole('switch', { name: 'Bài mẫu' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('textbox', { name: 'Introduction' })).toBeVisible()
    expect(screen.queryByText(/Các cụm được tô nổi/)).not.toBeInTheDocument()
  })

  it('shows the sample before submission inside the existing read-only fields', async () => {
    renderEssay({ ...essay, sampleAnswer: SAMPLE })
    const introduction = screen.getByRole('textbox', { name: 'Introduction' })
    await userEvent.click(screen.getByRole('switch', { name: 'Bài mẫu' }))

    expect(screen.getByRole('switch', { name: 'Bài mẫu' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('textbox', { name: 'Introduction' })).toBe(introduction)
    expect(introduction).toBeVisible()
    expect(introduction).toHaveAttribute('readonly')
    expect(introduction).toHaveValue('The chart compares the car ownership rate in four countries.')
    expect(screen.getByRole('textbox', { name: 'Overview' }))
      .toHaveValue('Overall, ownership rose in three countries.')
    expect(screen.getByRole('textbox', { name: 'Body 1' }))
      .toHaveValue('Country D led in 2000 and A recorded a rise by 2020.')
    expect(screen.getByRole('textbox', { name: 'Body 2' }))
      .toHaveValue('By comparison, B and C began lower.')
    expect(submitPracticeEssay).not.toHaveBeenCalled()
  })

  it('keeps what the learner wrote while the sample is on', async () => {
    renderEssay({ ...essay, sampleAnswer: SAMPLE })
    await userEvent.type(screen.getByRole('textbox', { name: 'Introduction' }), 'My own introduction')

    await userEvent.click(screen.getByRole('switch', { name: 'Bài mẫu' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Bài mẫu' }))

    expect(screen.getByRole('textbox', { name: 'Introduction' })).toHaveValue('My own introduction')
    expect(screen.queryByRole('heading', { level: 4 })).not.toBeInTheDocument()
  })

  it('offers the sample from the graded submission when the essay did not carry one', async () => {
    submitPracticeEssay.mockResolvedValue({ ...grade, sampleAnswer: SAMPLE })
    renderEssay(essay)
    expect(screen.queryByRole('switch', { name: 'Bài mẫu' })).not.toBeInTheDocument()

    await userEvent.type(screen.getByRole('textbox', { name: 'Introduction' }), 'Free tuition helps students')
    await userEvent.click(screen.getByRole('button', { name: 'Nộp để chấm' }))

    expect(await screen.findByRole('switch', { name: 'Bài mẫu' })).toBeInTheDocument()
  })
})
