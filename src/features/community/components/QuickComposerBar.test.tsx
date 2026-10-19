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
})
