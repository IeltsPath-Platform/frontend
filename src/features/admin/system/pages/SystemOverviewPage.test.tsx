import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemOverviewPage } from './SystemOverviewPage'

const { fetchServiceSnapshot, fetchActivityStats, listUsers } = vi.hoisted(() => ({
  fetchServiceSnapshot: vi.fn(), fetchActivityStats: vi.fn(), listUsers: vi.fn(),
}))
vi.mock('../api/systemAdminApi', () => ({ fetchServiceSnapshot, fetchActivityStats }))
vi.mock('../../users/api/userAdminApi', () => ({ listUsers }))

const users = [{
  id: '1', email: 'admin@example.com', fullName: 'Admin', phoneNumber: null, status: 'LOCKED',
  roles: [{ id: 'admin-role', name: 'ADMIN' }, { id: 'customer-role', name: 'CUSTOMER' }],
  createdAt: '2026-10-01T10:00:00', updatedAt: '2026-10-01T10:00:00',
}]

describe('SystemOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchServiceSnapshot.mockRejectedValue(new Error('Service monitor is unavailable'))
    listUsers.mockResolvedValue(users)
    fetchActivityStats.mockResolvedValue({ from: '2026-10-01', to: '2026-10-07', daily: [{ day: '2026-10-07', dau: 5, wau: 12, mau: 20 }], retention: [] })
  })

  it('keeps the user and activity summaries available when the service block fails', async () => {
    render(<MemoryRouter><SystemOverviewPage /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(await screen.findByLabelText('Người dùng')).toHaveTextContent('1 tài khoản · 1 bị khóa')
    expect(screen.getByText('Quản trị hệ thống: 1')).toBeInTheDocument()
    expect(screen.getByText('Ngày 2026-10-07 (UTC)')).toBeInTheDocument()
  })
})
