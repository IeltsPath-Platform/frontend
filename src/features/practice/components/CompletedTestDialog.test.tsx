import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CompletedTestDialog } from './CompletedTestDialog'

function renderDialog(props: Partial<Parameters<typeof CompletedTestDialog>[0]> = {}) {
  const handlers = { onViewResult: vi.fn(), onRedo: vi.fn(), onClose: vi.fn() }
  render(<CompletedTestDialog title="Passage 1: Sunlight for the village" busy={false} error="" {...handlers} {...props} />)
  return handlers
}

describe('CompletedTestDialog', () => {
  it('names the test and says it was already done', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Passage 1: Sunlight for the village' })).toBeInTheDocument()
    expect(screen.getByText('Bạn đã làm bài này rồi')).toBeInTheDocument()
  })

  it('opens the result or starts again', async () => {
    const { onViewResult, onRedo } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Xem kết quả' }))
    await userEvent.click(screen.getByRole('button', { name: 'Làm lại' }))

    expect(onViewResult).toHaveBeenCalledTimes(1)
    expect(onRedo).toHaveBeenCalledTimes(1)
  })

  it('disables both choices while the result is being looked up', () => {
    renderDialog({ busy: true })

    expect(screen.getByRole('button', { name: 'Xem kết quả' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Làm lại' })).toBeDisabled()
  })

  it('shows why the result could not be opened', () => {
    renderDialog({ error: 'Không tìm thấy bài làm đã nộp của đề này.' })

    expect(screen.getByRole('alert')).toHaveTextContent('Không tìm thấy bài làm đã nộp của đề này.')
  })
})
