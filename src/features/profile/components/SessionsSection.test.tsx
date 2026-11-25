import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listSessionsMock, revokeSessionMock, revokeOtherSessionsMock } = vi.hoisted(() => ({
  listSessionsMock: vi.fn(),
  revokeSessionMock: vi.fn(),
  revokeOtherSessionsMock: vi.fn(),
}))
vi.mock('../api/profileApi', () => ({
  profileApi: {
    listSessions: listSessionsMock,
    revokeSession: revokeSessionMock,
    revokeOtherSessions: revokeOtherSessionsMock,
  },
}))

import { SessionsSection } from './SessionsSection'

const sessions = [
  { sessionId: 'current-family', current: true, userAgent: 'Chrome on Windows', ipAddress: '203.0.113.x', lastUsedAt: null, startedAt: null },
  { sessionId: 'other-family', current: false, userAgent: 'Safari on iPhone', ipAddress: '198.51.100.x', lastUsedAt: null, startedAt: null },
]

describe('SessionsSection', () => {
  beforeEach(() => {
    listSessionsMock.mockReset().mockResolvedValue(sessions)
    revokeSessionMock.mockReset().mockResolvedValue(undefined)
    revokeOtherSessionsMock.mockReset().mockResolvedValue(undefined)
  })

  it('marks the current device and offers to end the others', async () => {
    render(<SessionsSection onShowToast={vi.fn()} />)

    expect(await screen.findByText('Chrome on Windows')).toBeInTheDocument()
    expect(screen.getByText('Thiết bị này')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Đăng xuất thiết bị' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Đăng xuất các thiết bị khác' })).toBeInTheDocument()
  })

  it('ends one device and reloads the list', async () => {
    const onShowToast = vi.fn()
    render(<SessionsSection onShowToast={onShowToast} />)
    await screen.findByText('Safari on iPhone')

    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất thiết bị' }))

    await waitFor(() => expect(revokeSessionMock).toHaveBeenCalledWith('other-family'))
    await waitFor(() => expect(onShowToast).toHaveBeenCalledWith('Đã đăng xuất thiết bị.', 'success'))
    expect(listSessionsMock).toHaveBeenCalledTimes(2)
  })

  it('asks before ending all other devices', async () => {
    render(<SessionsSection onShowToast={vi.fn()} />)
    await screen.findByText('Safari on iPhone')

    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất các thiết bị khác' }))
    const dialog = screen.getByRole('dialog')
    expect(revokeOtherSessionsMock).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Đăng xuất' }))
    await waitFor(() => expect(revokeOtherSessionsMock).toHaveBeenCalledTimes(1))
  })

  it('shows a message when the list cannot be loaded', async () => {
    listSessionsMock.mockRejectedValue(new Error('network'))
    render(<SessionsSection onShowToast={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được danh sách thiết bị')
  })
})
