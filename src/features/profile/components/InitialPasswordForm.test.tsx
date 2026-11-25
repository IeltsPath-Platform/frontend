import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'

const { reauthMock } = vi.hoisted(() => ({ reauthMock: vi.fn() }))
vi.mock('../api/profileApi', () => ({ profileApi: { reauth: reauthMock } }))
vi.mock('@/features/auth/components/GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onCredential }: { onCredential: (token: string) => void }) => (
    <button type="button" onClick={() => onCredential('id-token')}>Google mock</button>
  ),
}))

import { InitialPasswordForm } from './InitialPasswordForm'

function renderForm(onSetInitialPassword = vi.fn().mockResolvedValue(undefined)) {
  const onShowToast = vi.fn()
  render(<InitialPasswordForm onSetInitialPassword={onSetInitialPassword} onShowToast={onShowToast} />)
  return { onSetInitialPassword, onShowToast }
}

async function confirmWithGoogle() {
  reauthMock.mockResolvedValue({ reauthToken: 'tok-g', expiresInSeconds: 300, method: 'GOOGLE' })
  fireEvent.click(screen.getByRole('button', { name: 'Google mock' }))
  await screen.findByLabelText(/Mật khẩu mới/)
}

describe('InitialPasswordForm', () => {
  beforeEach(() => {
    reauthMock.mockReset()
  })

  it('shows the password fields only after the user confirmed with Google', async () => {
    renderForm()
    expect(screen.queryByLabelText(/Mật khẩu mới/)).toBeNull()

    await confirmWithGoogle()

    expect(reauthMock).toHaveBeenCalledWith({ googleIdToken: 'id-token' })
    expect(screen.getByLabelText(/Xác nhận mật khẩu mới/)).toBeInTheDocument()
  })

  it('creates the password with the Google token and refuses a mismatched confirmation', async () => {
    const { onSetInitialPassword } = renderForm()
    await confirmWithGoogle()

    fireEvent.change(screen.getByLabelText(/Mật khẩu mới/), { target: { value: 'New-pass-2026' } })
    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu mới/), { target: { value: 'other-pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mật khẩu' }))
    expect(await screen.findByText('Mật khẩu xác nhận không khớp.')).toBeInTheDocument()
    expect(onSetInitialPassword).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu mới/), { target: { value: 'New-pass-2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mật khẩu' }))
    await waitFor(() => expect(onSetInitialPassword).toHaveBeenCalledWith('New-pass-2026', 'tok-g'))
  })

  it('shows a weak password reason under the new password field', async () => {
    const onSetInitialPassword = vi.fn().mockRejectedValue(
      new HttpError(400, 'Mật khẩu chưa đủ mạnh.', { details: { reasons: 'TOO_COMMON' } }, 'WEAK_PASSWORD'),
    )
    renderForm(onSetInitialPassword)
    await confirmWithGoogle()

    fireEvent.change(screen.getByLabelText(/Mật khẩu mới/), { target: { value: 'Password123' } })
    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu mới/), { target: { value: 'Password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mật khẩu' }))

    expect(await screen.findByText(/quá phổ biến/)).toBeInTheDocument()
  })
})
