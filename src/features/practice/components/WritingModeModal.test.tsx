import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WritingModeModal } from './WritingModeModal'

describe('WritingModeModal', () => {
  it('offers the practice and the exam screens, practice first', async () => {
    const onConfirm = vi.fn()
    render(<WritingModeModal title="Task 1: Library visits" onClose={() => {}} onConfirm={onConfirm} />)

    expect(screen.getByRole('button', { name: /Giao diện Luyện tập/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'BẮT ĐẦU LÀM BÀI' }))

    expect(onConfirm).toHaveBeenCalledWith('practice')
  })

  it('starts the exam when it is chosen', async () => {
    const onConfirm = vi.fn()
    render(<WritingModeModal title="Task 2: Working from home" onClose={() => {}} onConfirm={onConfirm} />)

    await userEvent.click(screen.getByRole('button', { name: /Giao diện Thi thật/ }))
    await userEvent.click(screen.getByRole('button', { name: 'BẮT ĐẦU LÀM BÀI' }))

    expect(onConfirm).toHaveBeenCalledWith('exam')
  })
})
