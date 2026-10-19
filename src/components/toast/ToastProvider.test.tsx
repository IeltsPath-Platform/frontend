import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from './ToastProvider'
import { useToast } from './toastContext'

function Trigger({ title, duration }: { title: string; duration?: number }) {
  const { toast } = useToast()
  return <button type="button" onClick={() => toast({ title, duration })}>show</button>
}

function renderWithToasts(title = 'Đã lưu', duration?: number) {
  return render(
    <ToastProvider>
      <Trigger title={title} duration={duration} />
    </ToastProvider>,
  )
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a toast and fades it out after its duration', () => {
    renderWithToasts('Đã lưu', 1000)
    fireEvent.click(screen.getByRole('button', { name: 'show' }))

    const toast = screen.getByText('Đã lưu').closest('.toast')
    expect(toast).toHaveAttribute('data-closing', 'false')

    act(() => { vi.advanceTimersByTime(1000) })
    expect(toast).toHaveAttribute('data-closing', 'true')
  })

  it('removes the toast from the DOM once the fade-out finishes', () => {
    renderWithToasts('Đã lưu', 1000)
    fireEvent.click(screen.getByRole('button', { name: 'show' }))

    act(() => { vi.advanceTimersByTime(1000) })
    act(() => { vi.advanceTimersByTime(200) })
    expect(screen.queryByText('Đã lưu')).not.toBeInTheDocument()
  })

  it('closes immediately when the close button is pressed', () => {
    renderWithToasts('Đã lưu', 10_000)
    fireEvent.click(screen.getByRole('button', { name: 'show' }))

    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }))
    expect(screen.getByText('Đã lưu').closest('.toast')).toHaveAttribute('data-closing', 'true')

    act(() => { vi.advanceTimersByTime(200) })
    expect(screen.queryByText('Đã lưu')).not.toBeInTheDocument()
  })

  it('announces errors as alerts and other tones as status', () => {
    function ErrorTrigger() {
      const { toast } = useToast()
      return <button type="button" onClick={() => toast({ title: 'Lỗi mạng', tone: 'error' })}>fail</button>
    }
    render(<ToastProvider><ErrorTrigger /></ToastProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'fail' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Lỗi mạng')
  })

  it('keeps at most three toasts on screen', () => {
    renderWithToasts('Thông báo', 10_000)
    const trigger = screen.getByRole('button', { name: 'show' })
    for (let index = 0; index < 4; index++) fireEvent.click(trigger)

    expect(screen.getAllByText('Thông báo')).toHaveLength(3)
  })
})
