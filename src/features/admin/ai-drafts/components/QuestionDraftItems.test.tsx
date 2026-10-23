import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { QuestionDraftItem } from '../types'
import { QuestionDraftItems } from './QuestionDraftItems'

const choice: QuestionDraftItem = {
  stem: 'Which statement matches the passage?', difficulty: 'MEDIUM', explanation: 'The first paragraph supports B.',
  options: [{ optionKey: 'B', content: 'The supported statement', sortOrder: 2 }, { optionKey: 'A', content: 'The incorrect statement', sortOrder: 1 }],
  answerSpec: { type: 'CHOICE', correct: 'B', distractors: { A: 'READING_INFERENCE' } },
}
const fill: QuestionDraftItem = {
  stem: 'Complete the answer.', difficulty: 'HARD', explanation: 'Both spellings are accepted.', options: [],
  answerSpec: { type: 'FILL', accepted: ['colour', 'color'], maxWords: 2 },
}

describe('QuestionDraftItems', () => {
  it('sorts options visually and marks the correct answer with text and an accent class', () => {
    render(<QuestionDraftItems items={[choice]} selected={[]} disabled={false} onChange={vi.fn()} />)
    const options = within(screen.getByRole('article', { name: 'Câu 1' })).getAllByRole('listitem')
    expect(options[0]).toHaveTextContent('A.The incorrect statement')
    expect(options[0]).toHaveTextContent('Mã lỗi: READING_INFERENCE')
    expect(options[1]).toHaveTextContent('B.The supported statement')
    expect(options[1]).toHaveTextContent('Đáp án đúng')
    expect(options[1]).toHaveClass('adm-draft-option--correct')
    expect(choice.options[0]?.optionKey).toBe('B')
    expect(screen.getByText(choice.explanation)).toBeInTheDocument()
    expect(screen.getByText('Độ khó: Vừa')).toBeInTheDocument()
  })

  it('shows every accepted typed answer and the word limit', () => {
    render(<QuestionDraftItems items={[fill]} selected={[]} disabled={false} onChange={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Đáp án được chấp nhận' })).toBeInTheDocument()
    expect(screen.getByText('colour')).toBeInTheDocument()
    expect(screen.getByText('color')).toBeInTheDocument()
    expect(screen.getByText('Tối đa 2 từ.')).toBeInTheDocument()
  })

  it('emits the original zero-based item indexes when selecting or deselecting', () => {
    const onChange = vi.fn()
    const { rerender } = render(<QuestionDraftItems items={[choice, fill, choice]} selected={[2]} disabled={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn câu 1 để duyệt' }))
    expect(onChange).toHaveBeenLastCalledWith([0, 2])
    rerender(<QuestionDraftItems items={[choice, fill, choice]} selected={[0, 2]} disabled={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn câu 3 để duyệt' }))
    expect(onChange).toHaveBeenLastCalledWith([0])
  })

  it('locks selection during review and renders content as plain text', () => {
    const onChange = vi.fn()
    render(<QuestionDraftItems items={[{ ...choice, stem: '<img src=x onerror=alert(1)>', explanation: '<script>alert(1)</script>' }]} selected={[0]} disabled onChange={onChange} />)
    const checkbox = screen.getByRole('checkbox', { name: 'Chọn câu 1 để duyệt' })
    expect(checkbox).toBeChecked()
    expect(checkbox).toBeDisabled()
    fireEvent.click(checkbox)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
