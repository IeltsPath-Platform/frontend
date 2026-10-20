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
