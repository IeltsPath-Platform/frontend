import { fireEvent, render, screen, within } from '@/test/render'
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
const actions = { onView: vi.fn(), onEdit: vi.fn(), onRemove: vi.fn() }

describe('QuestionDraftItems', () => {
  it('shows each question on one row with the key of its correct answer and its difficulty', () => {
    render(<QuestionDraftItems items={[choice, fill]} selected={[]} disabled={false} onChange={vi.fn()} />)
    const table = screen.getByRole('table', { name: 'Câu hỏi sinh được' })
    const first = within(table).getAllByRole('row')[1]!
    expect(within(first).getByText('B')).toBeInTheDocument()
    expect(within(first).getByText('The supported statement')).toBeInTheDocument()
    expect(within(first).getByText('Vừa')).toBeInTheDocument()
    expect(within(first).getByText('Which statement matches the passage?')).toBeInTheDocument()
  })

  it('shows the first accepted answer of a typed question and how many more there are', () => {
    render(<QuestionDraftItems items={[fill]} selected={[]} disabled={false} onChange={vi.fn()} />)
    const row = screen.getByRole('table', { name: 'Câu hỏi sinh được' })
    expect(within(row).getByText('colour')).toBeInTheDocument()
    expect(within(row).getByText('+1')).toBeInTheDocument()
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
    render(<QuestionDraftItems items={[{ ...choice, stem: '<img src=x onerror=alert(1)>' }]} selected={[0]} disabled onChange={onChange} />)
    const checkbox = screen.getByRole('checkbox', { name: 'Chọn câu 1 để duyệt' })
    expect(checkbox).toBeChecked()
    expect(checkbox).toBeDisabled()
    fireEvent.click(checkbox)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('puts a row menu with view, edit and remove on each question while the draft is under review', () => {
    render(<QuestionDraftItems actions={actions} items={[choice]} selected={[]} disabled={false} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hành động của câu 1' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Xem câu 1' }))
    expect(actions.onView).toHaveBeenCalledWith(0)
  })

  it('disables edit and remove in the menu while locked, but keeps viewing', () => {
    render(<QuestionDraftItems actions={actions} items={[choice]} selected={[]} disabled onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hành động của câu 1' }))
    expect(screen.getByRole('menuitem', { name: 'Sửa câu 1' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Xóa câu 1' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Xem câu 1' })).toBeEnabled()
  })

  it('has no action column once the draft has left the review', () => {
    render(<QuestionDraftItems items={[choice]} selected={[]} disabled onChange={vi.fn()} />)
    expect(screen.queryByRole('columnheader', { name: 'Hành động' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hành động/ })).not.toBeInTheDocument()
  })
})
