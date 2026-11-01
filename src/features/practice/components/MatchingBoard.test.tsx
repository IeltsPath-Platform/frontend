import { createEvent, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MatchingBoard } from './MatchingBoard'

const options = [
  { value: 'A', label: 'It can be done in short sessions.' },
  { value: 'B', label: 'Preparation is needed before starting.' },
  { value: 'C', label: 'It involves working outdoors.' },
]

function renderBoard(values: Record<string, string> = {}, disabled = false) {
  const onChange = vi.fn()
  const onFocusRow = vi.fn()
  render(
    <MatchingBoard
      rows={[
        { id: 'q1', number: 11, prompt: 'Photograph team', value: values.q1 ?? '' },
        { id: 'q2', number: 12, prompt: 'Oral history team', value: values.q2 ?? '' },
      ]}
      options={options}
      disabled={disabled}
      rowIdPrefix="row-"
      onChange={onChange}
      onFocusRow={onFocusRow}
    />,
  )
  return { onChange, onFocusRow }
}

describe('MatchingBoard', () => {
  it('lists the statements and the shared options', () => {
    renderBoard()

    expect(screen.getByText('Photograph team')).toBeInTheDocument()
    expect(screen.getByText('List of options')).toBeInTheDocument()
    expect(screen.getByText('Preparation is needed before starting.')).toBeInTheDocument()
  })

  it('puts a chosen option into the slot clicked after it', async () => {
    const { onChange, onFocusRow } = renderBoard()

    await userEvent.click(screen.getByRole('button', { name: /It involves working outdoors/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Câu 12: chưa chọn' }))

    expect(onChange).toHaveBeenCalledWith('q2', 'C')
    expect(onFocusRow).toHaveBeenCalledWith(12)
  })

  it('puts an option into the slot chosen before it', async () => {
    const { onChange } = renderBoard()

    await userEvent.click(screen.getByRole('button', { name: 'Câu 11: chưa chọn' }))
    await userEvent.click(screen.getByRole('button', { name: /It can be done in short sessions/ }))

    expect(onChange).toHaveBeenCalledWith('q1', 'A')
  })

  it('takes an option dropped on a slot', () => {
    const { onChange } = renderBoard()
    const slot = screen.getByRole('button', { name: 'Câu 11: chưa chọn' }).closest('.mb-slot')!

    const drop = createEvent.drop(slot)
    Object.defineProperty(drop, 'dataTransfer', { value: { getData: () => 'B' } })
    fireEvent(slot, drop)

    expect(onChange).toHaveBeenCalledWith('q1', 'B')
  })

  it('shows the chosen option in its slot and can empty it', async () => {
    const { onChange } = renderBoard({ q1: 'B' })

    expect(screen.getByRole('button', { name: 'Câu 11: đã chọn B' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ đáp án câu 11' }))

    expect(onChange).toHaveBeenCalledWith('q1', '')
  })

  it('does nothing when it is disabled', async () => {
    const { onChange } = renderBoard({ q1: 'B' }, true)

    await userEvent.click(screen.getByRole('button', { name: /It can be done in short sessions/ }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Bỏ đáp án câu 11' })).not.toBeInTheDocument()
  })
})
