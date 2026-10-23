import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeItem } from '../testFixtures'
import { QuestionDraftItemEditor } from './QuestionDraftItemEditor'

describe('QuestionDraftItemEditor', () => {
  it('edits a choice item with its exact options, correct key and replacement distractors', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<QuestionDraftItemEditor item={makeItem(0)} index={2} disabled={false} onSave={onSave} onCancel={vi.fn()} />)
    const form = screen.getByRole('form', { name: 'Sửa câu 3' })
    fireEvent.change(within(form).getByLabelText('Nội dung câu hỏi'), { target: { value: 'Edited stem' } })
    fireEvent.change(within(form).getByLabelText('Đáp án đúng'), { target: { value: 'B' } })
    fireEvent.change(within(form).getByLabelText('Mã lỗi lựa chọn 1 (không bắt buộc)'), { target: { value: 'PARAPHRASE_TRAP' } })
    fireEvent.submit(form)
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ stem: 'Edited stem', explanation: 'Explanation 1', options: [{ optionKey: 'A', content: 'Right answer' }, { optionKey: 'B', content: 'Wrong answer' }], correct: 'B', distractors: { A: 'PARAPHRASE_TRAP' } }))
  })

  it('clears distractors with an empty map and never sends sortOrder or difficulty', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<QuestionDraftItemEditor item={makeItem(0)} index={0} disabled={false} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Mã lỗi lựa chọn 2 (không bắt buộc)'), { target: { value: '' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ distractors: {} })))
    expect(onSave.mock.calls[0]![0]).not.toHaveProperty('difficulty')
    expect(onSave.mock.calls[0]![0].options[0]).not.toHaveProperty('sortOrder')
  })

  it('edits accepted answers as separate lines for typed questions', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<QuestionDraftItemEditor item={{ ...makeItem(0), options: [], answerSpec: { type: 'FILL', accepted: ['colour'] } }} index={0} disabled={false} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Đáp án được chấp nhận (mỗi dòng một đáp án)'), { target: { value: 'colour\ncolor\n' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ stem: 'Question stem 1', explanation: 'Explanation 1', accepted: ['colour', 'color'] }))
    expect(screen.queryByLabelText('Đáp án đúng')).not.toBeInTheDocument()
  })

  it('retains entered values after the save is declined', async () => {
    const onSave = vi.fn().mockResolvedValue(false)
    render(<QuestionDraftItemEditor item={makeItem(0)} index={0} disabled={false} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nội dung câu hỏi'), { target: { value: 'Still editing' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(screen.getByLabelText('Nội dung câu hỏi')).toHaveValue('Still editing')
  })

  it('requires nonblank content and valid distinct choice keys', () => {
    const onSave = vi.fn()
    render(<QuestionDraftItemEditor item={makeItem(0)} index={0} disabled={false} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Mã lựa chọn 2'), { target: { value: 'A' } })
    fireEvent.submit(screen.getByRole('form'))
    expect(screen.getByRole('alert')).toHaveTextContent('Cần 2–6 lựa chọn')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('locks every input and action while pending', () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()
    render(<QuestionDraftItemEditor item={makeItem(0)} index={0} disabled onSave={onSave} onCancel={onCancel} />)
    expect(screen.getByLabelText('Nội dung câu hỏi')).toBeDisabled()
    expect(screen.getByLabelText('Đáp án đúng')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Hủy sửa' })).toBeDisabled()
    fireEvent.submit(screen.getByRole('form'))
    expect(onSave).not.toHaveBeenCalled()
  })
})
