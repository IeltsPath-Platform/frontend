import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResetPasswordPage } from './ResetPasswordPage'

const { resetPasswordMock, toastMock } = vi.hoisted(() => ({
  resetPasswordMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock('../api/authApi', () => ({ authApi: { resetPassword: resetPasswordMock } }))
vi.mock('../components/AuthShell', () => ({ AuthShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/toast/toastContext', () => ({ useToast: () => ({ toast: toastMock }) }))

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPasswordMock.mockResolvedValue({ message: 'Đặt lại mật khẩu thành công' })
    window.history.replaceState({}, '', '/')
  })

  it('uses the URL token and removes it from the address bar', async () => {
    window.history.replaceState({}, '', '/reset-password?token=secret-reset')
    render(<MemoryRouter initialEntries={['/reset-password?token=secret-reset']}><ResetPasswordPage /></MemoryRouter>)
    expect(screen.queryByLabelText('Mã đặt lại')).not.toBeInTheDocument()
    await waitFor(() => expect(window.location.search).toBe(''))
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'secure-password' } })
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), { target: { value: 'secure-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))
    await waitFor(() => expect(resetPasswordMock).toHaveBeenCalledWith({ token: 'secret-reset', newPassword: 'secure-password' }))
  })
})
