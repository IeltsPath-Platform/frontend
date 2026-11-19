import { useState } from 'react'
import { fireEvent, render, screen } from '@/test/render'
import { describe, expect, it, vi } from 'vitest'
import { AdminSwitch } from './AdminSwitch'

function Harness({ onChange = vi.fn() }: { onChange?: (checked: boolean) => void }) {
  const [on, setOn] = useState(false)
  return <AdminSwitch checked={on} onChange={(next) => { setOn(next); onChange(next) }}>Khóa học miễn phí</AdminSwitch>
}

describe('AdminSwitch', () => {
  it('is a switch named by its label that flips on click', () => {
    const changed = vi.fn()
    render(<Harness onChange={changed} />)
    const toggle = screen.getByRole('switch', { name: 'Khóa học miễn phí' })
    expect(toggle).not.toBeChecked()
    fireEvent.click(toggle)
    expect(toggle).toBeChecked()
    expect(changed).toHaveBeenLastCalledWith(true)
    fireEvent.click(screen.getByText('Khóa học miễn phí'))
    expect(toggle).not.toBeChecked()
    expect(changed).toHaveBeenLastCalledWith(false)
  })

  it('is disabled when asked to be', () => {
    render(<AdminSwitch checked={false} disabled onChange={vi.fn()}>Chỉ KP có cảnh báo</AdminSwitch>)
    expect(screen.getByRole('switch', { name: 'Chỉ KP có cảnh báo' })).toBeDisabled()
  })
})
