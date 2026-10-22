import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteNavbar } from './SiteNavbar'

const { authSessionMock } = vi.hoisted(() => ({ authSessionMock: vi.fn() }))

vi.mock('@/features/auth/authSession', () => ({
  logoutSession: vi.fn(),
  setDemoTier: vi.fn(),
  useAuthSession: authSessionMock,
}))

vi.mock('@/features/community/components/NotificationBell', () => ({
  NotificationBell: () => <span aria-hidden="true" />,
}))

vi.mock('./UserTierDropdown', () => ({
  UserTierDropdown: () => <span aria-hidden="true" />,
}))

describe('SiteNavbar member navigation', () => {
  beforeEach(() => {
    authSessionMock.mockReturnValue({ isLoggedIn: true, userName: 'Học viên' })
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    })
  })

  it('places Home before Community', () => {
    render(<MemoryRouter initialEntries={['/overview']}><SiteNavbar /></MemoryRouter>)

    const home = screen.getByRole('link', { name: 'Trang chủ' })
    const community = screen.getByRole('link', { name: 'Cộng đồng' })
    expect(Boolean(home.compareDocumentPosition(community) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  it('links staff roles to the admin area and nobody else', () => {
    authSessionMock.mockReturnValue({ isLoggedIn: true, userName: 'R&D', roles: ['CONTENT_AUTHOR'] })
    const { unmount } = render(<MemoryRouter initialEntries={['/overview']}><SiteNavbar /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Quản trị' })).toHaveAttribute('href', '/admin')
    unmount()

    authSessionMock.mockReturnValue({ isLoggedIn: true, userName: 'Học viên', roles: ['CUSTOMER'] })
    render(<MemoryRouter initialEntries={['/overview']}><SiteNavbar /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Quản trị' })).not.toBeInTheDocument()
  })
})
