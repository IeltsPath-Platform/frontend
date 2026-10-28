import { act, renderHook, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/toast/ToastProvider'
import { useAdminError } from './useAdminError'

describe('useAdminError', () => {
  it('keeps the message like state and shows it as an error toast', () => {
    const { result } = renderHook(() => useAdminError(), { wrapper: ToastProvider })

    act(() => result.current[1]('Không lưu được.'))

    expect(result.current[0]).toBe('Không lưu được.')
    expect(screen.getByRole('alert')).toHaveTextContent('Không lưu được.')
  })

  it('shows the same message again each time it is set', () => {
    const { result } = renderHook(() => useAdminError(), { wrapper: ToastProvider })

    act(() => result.current[1]('Sai mã.'))
    act(() => result.current[1]('Sai mã.'))

    expect(screen.getAllByText('Sai mã.')).toHaveLength(2)
  })

  it('shows nothing when the error is cleared', () => {
    const { result } = renderHook(() => useAdminError(), { wrapper: ToastProvider })

    act(() => result.current[1](null))

    expect(result.current[0]).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps the lines of a long message apart', () => {
    const { result } = renderHook(() => useAdminError(), { wrapper: ToastProvider })

    act(() => result.current[1]('Chưa lưu được:\nThiếu đáp án\nThiếu câu hỏi'))

    expect(screen.getByRole('alert').textContent).toContain('Chưa lưu được:\nThiếu đáp án\nThiếu câu hỏi')
  })
})
