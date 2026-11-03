import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QuickComposerBar } from './QuickComposerBar'

describe('QuickComposerBar', () => {
  it('opens the composer on the matching image or video tab', () => {
    const onOpenComposer = vi.fn()
    render(<QuickComposerBar userName="Mai" onOpenComposer={onOpenComposer} />)
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ảnh' }))
    expect(onOpenComposer).toHaveBeenLastCalledWith('IMAGE')
    fireEvent.click(screen.getByRole('button', { name: 'Đăng video' }))
    expect(onOpenComposer).toHaveBeenLastCalledWith('VIDEO')
  })

  it('opens the composer with the emoji picker from the feelings button', () => {
    const onOpenComposer = vi.fn()
    render(<QuickComposerBar userName="Mai" onOpenComposer={onOpenComposer} />)
    fireEvent.click(screen.getByRole('button', { name: 'Thêm cảm xúc' }))
    expect(onOpenComposer).toHaveBeenLastCalledWith('EMOJI')
  })

  it('opens a plain composer from the prompt field', () => {
    const onOpenComposer = vi.fn()
    render(<QuickComposerBar userName="Mai" onOpenComposer={onOpenComposer} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bài viết mới' }))
    expect(onOpenComposer).toHaveBeenLastCalledWith()
  })
})
