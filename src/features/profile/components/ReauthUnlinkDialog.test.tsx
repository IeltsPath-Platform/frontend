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

import { ReauthUnlinkDialog } from './ReauthUnlinkDialog'

describe('ReauthUnlinkDialog', () => {
  beforeEach(() => {
    reauthMock.mockReset()
  })

  it('confirms with the current password and hands the single-use token to the unlink step', async () => {
    reauthMock.mockResolvedValue({ reauthToken: 'tok-1', expiresInSeconds: 300, method: 'PASSWORD' })
    const onConfirmed = vi.fn().mockResolvedValue(undefined)
    render(<ReauthUnlinkDialog provider="google" hasPassword onConfirmed={onConfirmed} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/), { target: { value: 'current-pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gỡ' }))

    await waitFor(() => expect(onConfirmed).toHaveBeenCalledWith('tok-1'))
    expect(reauthMock).toHaveBeenCalledWith({ currentPassword: 'current-pass' })
  })

  it('shows a wrong password under its field and does not unlink', async () => {
    reauthMock.mockRejectedValue(new HttpError(400, 'Mật khẩu hiện tại không chính xác.', {}, 'CURRENT_PASSWORD_INVALID'))
    const onConfirmed = vi.fn()
    render(<ReauthUnlinkDialog provider="google" hasPassword onConfirmed={onConfirmed} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gỡ' }))

    expect(await screen.findByText('Mật khẩu hiện tại không chính xác.')).toBeInTheDocument()
    expect(onConfirmed).not.toHaveBeenCalled()
  })

  it('keeps the dialog open and shows the message when the unlink step is refused', async () => {
    reauthMock.mockResolvedValue({ reauthToken: 'tok-1', expiresInSeconds: 300, method: 'PASSWORD' })
    const onConfirmed = vi.fn().mockRejectedValue(new HttpError(403, 'Vui lòng xác thực lại để thực hiện thao tác này.', {}, 'REAUTH_REQUIRED'))
    render(<ReauthUnlinkDialog provider="google" hasPassword onConfirmed={onConfirmed} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/), { target: { value: 'current-pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gỡ' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng xác thực lại để thực hiện thao tác này.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('confirms with Google for an account that has no password', async () => {
    reauthMock.mockResolvedValue({ reauthToken: 'tok-g', expiresInSeconds: 300, method: 'GOOGLE' })
    const onConfirmed = vi.fn().mockResolvedValue(undefined)
    render(<ReauthUnlinkDialog provider="google" hasPassword={false} onConfirmed={onConfirmed} onCancel={vi.fn()} />)

    expect(screen.queryByLabelText(/Mật khẩu hiện tại/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Google mock' }))

    await waitFor(() => expect(onConfirmed).toHaveBeenCalledWith('tok-g'))
    expect(reauthMock).toHaveBeenCalledWith({ googleIdToken: 'id-token' })
  })
})
