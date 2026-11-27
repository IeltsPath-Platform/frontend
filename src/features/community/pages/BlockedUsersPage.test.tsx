import { fireEvent, render, screen, waitFor } from '@/test/render'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { communityApiMock } = vi.hoisted(() => ({
  communityApiMock: { blockedUsers: vi.fn(), unblock: vi.fn() },
}))
vi.mock('../api/communityApi', () => ({ communityApi: communityApiMock }))
vi.mock('@/components/SiteNavbar', () => ({ SiteNavbar: () => null }))

import { BlockedUsersPage } from './BlockedUsersPage'

const minh = { id: '8f3a2c1e-1111-4a2b-9c3d-000000000001', displayName: 'Minh Trần', avatarUrl: null }

function renderPage() {
  return render(<MemoryRouter><BlockedUsersPage /></MemoryRouter>)
}

describe('BlockedUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    communityApiMock.unblock.mockResolvedValue(undefined)
  })

  it('lists blocked people and removes one after unblocking', async () => {
    communityApiMock.blockedUsers.mockResolvedValue({ content: [minh], page: 0, size: 20, totalElements: 1, totalPages: 1 })
    renderPage()

    expect(await screen.findByText('Minh Trần')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ chặn' }))

    await waitFor(() => expect(communityApiMock.unblock).toHaveBeenCalledWith(minh.id))
    await waitFor(() => expect(screen.queryByText('Minh Trần')).not.toBeInTheDocument())
  })

  it('says so when nobody is blocked', async () => {
    communityApiMock.blockedUsers.mockResolvedValue({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
    renderPage()

    expect(await screen.findByText('Bạn chưa chặn ai.')).toBeInTheDocument()
  })

  it('loads the next page on request', async () => {
    communityApiMock.blockedUsers
      .mockResolvedValueOnce({ content: [minh], page: 0, size: 20, totalElements: 21, totalPages: 2 })
      .mockResolvedValueOnce({ content: [{ ...minh, id: '8f3a2c1e-1111-4a2b-9c3d-000000000002', displayName: 'Hoa Lê' }], page: 1, size: 20, totalElements: 21, totalPages: 2 })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Xem thêm' }))

    expect(await screen.findByText('Hoa Lê')).toBeInTheDocument()
    expect(screen.getByText('Minh Trần')).toBeInTheDocument()
    expect(communityApiMock.blockedUsers).toHaveBeenLastCalledWith(1, 20)
  })
})
