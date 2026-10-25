import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ErrorHint, Question, QuestionResult } from '~types/learningPath'
import { ErrorHintNote } from './ErrorHintNote'
import { QuestionField } from './QuestionField'

const hint: ErrorHint = {
  code: 'KEYWORD_MATCH_ONLY',
  name: 'Chọn đáp án chỉ vì trùng từ khóa',
  fixHint: 'Trùng từ khóa chưa đủ. Kiểm tra cả câu có đúng ý câu hỏi không.',
}

const question: Question = {
  id: 'q1', number: 1, prompt: 'Chọn đáp án đúng',
  options: [{ value: 'A', label: 'Big' }, { value: 'B', label: 'Large' }],
}

const wrong: QuestionResult = { questionId: 'q1', correct: false, correctAnswer: 'B', explanation: 'Large là đáp án.' }

function field(result?: QuestionResult) {
  return render(<QuestionField disabled onChange={() => undefined} question={question} result={result} value="A" />)
}

describe('ErrorHintNote', () => {
  it('names the error and says how to fix it, as a note a screen reader can find', () => {
    render(<ErrorHintNote hint={hint} variant="answer" />)

    const note = screen.getByRole('note', { name: 'Lỗi cần sửa' })
    expect(note).toHaveTextContent('Bạn mắc lỗi: Chọn đáp án chỉ vì trùng từ khóa')
    expect(note).toHaveTextContent('Trùng từ khóa chưa đủ. Kiểm tra cả câu có đúng ý câu hỏi không.')
  })

  it('words the review variant as an error to fix', () => {
    render(<ErrorHintNote hint={hint} variant="review" />)

    expect(screen.getByRole('note', { name: 'Lỗi cần sửa' })).toHaveTextContent('Lỗi cần sửa: Chọn đáp án chỉ vì trùng từ khóa')
  })

  it('shows only the name when there is no hint to give', () => {
    render(<ErrorHintNote hint={{ ...hint, fixHint: '' }} variant="answer" />)

    const note = screen.getByRole('note', { name: 'Lỗi cần sửa' })
    expect(note).toHaveTextContent('Bạn mắc lỗi: Chọn đáp án chỉ vì trùng từ khóa')
    expect(note.querySelectorAll('p')).toHaveLength(1)
  })
})

describe('QuestionField with an error', () => {
  it('shows the error of a wrong answer', () => {
    field({ ...wrong, error: hint })

    expect(screen.getByRole('note', { name: 'Lỗi cần sửa' })).toHaveTextContent(hint.name)
  })

  it('shows it next to the hint of the question and before the solution', () => {
    field({ ...wrong, hint: 'Đọc lại câu hỏi.', error: hint })

    expect(screen.getByText('Đọc lại câu hỏi.')).toBeInTheDocument()
    expect(screen.getByRole('note', { name: 'Lỗi cần sửa' })).toBeInTheDocument()
    expect(screen.getByText('Large là đáp án.')).toBeInTheDocument()
  })

  it('shows nothing for a right answer, even if the backend sent an error', () => {
    field({ ...wrong, correct: true, error: hint })

    expect(screen.queryByRole('note', { name: 'Lỗi cần sửa' })).not.toBeInTheDocument()
  })

  it('shows nothing when the wrong answer has no error', () => {
    field(wrong)

    expect(screen.queryByRole('note', { name: 'Lỗi cần sửa' })).not.toBeInTheDocument()
  })

  it('shows nothing before the question was graded', () => {
    field(undefined)

    expect(screen.queryByRole('note', { name: 'Lỗi cần sửa' })).not.toBeInTheDocument()
  })
})
