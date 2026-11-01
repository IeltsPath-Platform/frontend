import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ListeningToolRail } from './ListeningToolRail'

function renderRail(props: Partial<Parameters<typeof ListeningToolRail>[0]> = {}) {
  const onHighlight = vi.fn()
  const onNotes = vi.fn()
  render(<ListeningToolRail hasSelection={false} hint="" notesCount={0} onHighlight={onHighlight} onNotes={onNotes} {...props} />)
  return { onHighlight, onNotes }
}

describe('ListeningToolRail', () => {
  it('offers Highlight and Notes, and no bookmark', () => {
    renderRail()

    expect(screen.getByRole('button', { name: /Highlight/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Notes/ })).toBeInTheDocument()
    expect(screen.queryByText(/Đánh dấu/)).not.toBeInTheDocument()
  })

  it('runs the tool that was pressed', async () => {
    const { onHighlight, onNotes } = renderRail()

    await userEvent.click(screen.getByRole('button', { name: /Highlight/ }))
    await userEvent.click(screen.getByRole('button', { name: /Notes/ }))

    expect(onHighlight).toHaveBeenCalledTimes(1)
    expect(onNotes).toHaveBeenCalledTimes(1)
  })

  it('counts the notes of the section', () => {
    renderRail({ notesCount: 2 })

    expect(screen.getByRole('button', { name: /Notes \(2\)/ })).toBeInTheDocument()
  })

  it('tells what to do first, then what to press once words are selected', () => {
    const { rerender } = render(<ListeningToolRail hasSelection={false} hint="" notesCount={0} onHighlight={vi.fn()} onNotes={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Bôi đen chữ trong câu hỏi')

    rerender(<ListeningToolRail hasSelection hint="" notesCount={0} onHighlight={vi.fn()} onNotes={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Bấm Highlight (H) hoặc Notes (N)')
  })

  it('shows the hint it is given in place of the usual line', () => {
    renderRail({ hint: 'Bôi đen chữ trong câu hỏi, rồi bấm Highlight.' })

    expect(screen.getByRole('status')).toHaveTextContent('rồi bấm Highlight.')
  })
})
