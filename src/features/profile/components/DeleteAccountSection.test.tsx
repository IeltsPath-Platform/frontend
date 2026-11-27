import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'

const { deleteAccountMock, clearSessionMock, navigateMock } = vi.hoisted(() => ({
  deleteAccountMock: vi.fn(),
  clearSessionMock: vi.fn(),
  navigateMock: vi.fn(),
}))
vi.mock('../api/profileApi', () => ({ profileApi: { deleteAccount: deleteAccountMock } }))
vi.mock('@/features/auth/authSession', () => ({ clearAuthSession: clearSessionMock }))
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}))
vi.mock('@/features/auth/components/GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onCredential, disabled }: { onCredential: (token: string) => void; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={() => onCredential('id-token')}>Google mock</button>
  ),
}))

import { DeleteAccountDialog } from './DeleteAccountSection'

function renderDialog(hasPassword = true) {
  return render(<MemoryRouter><DeleteAccountDialog hasPassword={hasPassword} onCancel={vi.fn()} /></MemoryRouter>)
}

describe('DeleteAccountDialog', () => {
  beforeEach(() => {
    deleteAccountMock.mockReset()
    clearSessionMock.mockReset()
    navigateMock.mockReset()
  })

  it('keeps the delete button disabled until the confirmation word is typed', () => {
    renderDialog()
    const submit = screen.getByRole('button', { name: 'Xóa vĩnh viễn' })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/để xác nhận/), { target: { value: 'xóa' } })
    expect(submit).toBeEnabled()
  })

  it('deletes with the current password, clears the session and leaves the signed-in area', async () => {
    deleteAccountMock.mockResolvedValue(undefined)
    renderDialog()
    fireEvent.change(screen.getByLabelText(/để xác nhận/), { target: { value: 'XÓA' } })
    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/), { target: { value: 'current-pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/account/deleted', { replace: true }))
    expect(deleteAccountMock).toHaveBeenCalledWith({ currentPassword: 'current-pass' })
    expect(clearSessionMock).toHaveBeenCalled()
  })

  it('shows a wrong password under its field and keeps the session', async () => {
    deleteAccountMock.mockRejectedValue(new HttpError(400, 'Mật khẩu hiện tại không chính xác.', {}, 'INVALID_CURRENT_PASSWORD'))
    renderDialog()
    fireEvent.change(screen.getByLabelText(/để xác nhận/), { target: { value: 'XÓA' } })
    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }))

    expect(await screen.findByText('Mật khẩu hiện tại không chính xác.')).toBeInTheDocument()
    expect(clearSessionMock).not.toHaveBeenCalled()
  })

  it('deletes a Google-only account with a Google ID token', async () => {
    deleteAccountMock.mockResolvedValue(undefined)
    renderDialog(false)
    expect(screen.getByRole('button', { name: 'Google mock' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/để xác nhận/), { target: { value: 'XÓA' } })
    fireEvent.click(screen.getByRole('button', { name: 'Google mock' }))

    await waitFor(() => expect(deleteAccountMock).toHaveBeenCalledWith({ googleIdToken: 'id-token' }))
    expect(navigateMock).toHaveBeenCalledWith('/account/deleted', { replace: true })
  })
})
