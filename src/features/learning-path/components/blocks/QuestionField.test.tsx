import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Question, QuestionResult } from '~types/learningPath'
import { QuestionField } from './QuestionField'

const question: Question = { id: 'q-1', number: 1, prompt: 'Who wrote it?', options: null, hint: 'Look at the byline' }

function renderField(result?: QuestionResult) {
  return render(
    <QuestionField disabled={false} onChange={vi.fn()} question={question} result={result} value="Smith" />,
  )
}

const choice: Question = {
  id: 'q-2', number: 2, prompt: 'Which one?', hint: null,
  options: [{ value: 'A', label: 'One' }, { value: 'B', label: 'Two' }, { value: 'C', label: 'Three' }],
}

function renderChoice(result: QuestionResult | undefined, value: string) {
  return render(<QuestionField disabled={false} onChange={vi.fn()} question={choice} result={result} review value={value} />)
}

const optionOf = (label: string) => screen.getByText(label).closest('label') as HTMLElement

describe('QuestionField verdict on the question', () => {
  it('marks a wrong choice red and says so, without the right answer when the grade does not carry it', () => {
    renderChoice({ questionId: 'q-2', correct: false }, 'B')

    expect(optionOf('Two')).toHaveAttribute('data-verdict', 'wrong')
    expect(optionOf('One')).not.toHaveAttribute('data-verdict')
    expect(optionOf('Three')).not.toHaveAttribute('data-verdict')
    expect(screen.getByText('Bạn trả lời sai')).toBeInTheDocument()
    expect(screen.queryByText('Đáp án:')).not.toBeInTheDocument()
  })

  it('marks a right choice green and says so even when the grade does not carry the right answer', () => {
    renderChoice({ questionId: 'q-2', correct: true }, 'A')

    expect(optionOf('One')).toHaveAttribute('data-verdict', 'correct')
    expect(screen.getByText('Bạn trả lời đúng')).toBeInTheDocument()
  })

  it('marks both the wrong choice and the right option when the grade carries the right answer', () => {
    renderChoice({ questionId: 'q-2', correct: false, correctAnswer: 'C', explanation: 'Because.' }, 'B')

    expect(optionOf('Two')).toHaveAttribute('data-verdict', 'wrong')
    expect(optionOf('Three')).toHaveAttribute('data-verdict', 'correct')
    expect(screen.getByText('Đáp án:')).toBeInTheDocument()
  })

  it('shows no verdict before the question is graded', () => {
    renderChoice(undefined, 'B')

    expect(optionOf('Two')).not.toHaveAttribute('data-verdict')
    expect(screen.queryByText(/Bạn trả lời/)).not.toBeInTheDocument()
  })
})

describe('QuestionField hint', () => {
  it('hides the hint before the answer is graded', () => {
    renderField()

    expect(screen.queryByText('Look at the byline')).not.toBeInTheDocument()
  })

  it('shows the hint once the answer is graded wrong', () => {
    renderField({ questionId: 'q-1', correct: false, hint: 'Look at the byline' })

    expect(screen.getByText('Look at the byline')).toBeInTheDocument()
  })

  it('hides the hint after a right answer', () => {
    renderField({ questionId: 'q-1', correct: true })

    expect(screen.queryByText('Look at the byline')).not.toBeInTheDocument()
  })

  it('falls back to the question hint when the grade carries none', () => {
    renderField({ questionId: 'q-1', correct: false, hint: null })

    expect(screen.getByText('Look at the byline')).toBeInTheDocument()
  })
})
