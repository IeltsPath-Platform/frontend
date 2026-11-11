import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForgotPasswordPage } from './ForgotPasswordPage'

const { forgotPasswordMock, toastMock } = vi.hoisted(() => ({
  forgotPasswordMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock('../api/authApi', () => ({ authApi: { forgotPassword: forgotPasswordMock } }))
vi.mock('../components/AuthShell', () => ({ AuthShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/toast/toastContext', () => ({ useToast: () => ({ toast: toastMock }) }))

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    forgotPasswordMock.mockResolvedValue({ message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.' })
  })

  it('sends the request and enforces the resend cooldown', async () => {
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/^Email/),{ target: { value: 'learner@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi email đặt lại' }))
    await waitFor(() => expect(forgotPasswordMock).toHaveBeenCalledWith('learner@example.test'))
    expect(await screen.findByRole('button', { name: 'Gửi lại sau 60s' })).toBeDisabled()
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ tone: 'success' }))
    expect(screen.queryByText(/log|Swagger|demo/i)).not.toBeInTheDocument()
  })
})
