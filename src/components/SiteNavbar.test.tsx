import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
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

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

describe('SiteNavbar navigation', () => {
  beforeEach(() => {
    authSessionMock.mockReturnValue({ isLoggedIn: true, userName: 'Học viên' })
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    })
  })

  it('groups learning extras under a keyboard-operated discovery button', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/overview']}><SiteNavbar /></MemoryRouter>)
    const trigger = screen.getByRole('button', { name: 'Khám phá' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const sections = screen.getByRole('navigation', { name: 'Khám phá' })
    for (const label of ['Cộng đồng', 'Trò chơi', 'Nghe chép', 'Kho từ vựng', 'Flashcard của tôi']) {
      expect(within(sections).getByRole('link', { name: label })).toBeInTheDocument()
    }
    await user.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('navigation', { name: 'Khám phá' })).not.toBeInTheDocument()
  })

  it.each([undefined, 'CUSTOMER', 'ADMIN', 'CONTENT_AUTHOR'])('removes retired links for role %s', (role) => {
    authSessionMock.mockReturnValue({ isLoggedIn: Boolean(role), userName: 'Học viên', roles: role ? [role] : [] })
    render(<MemoryRouter initialEntries={['/vocabulary']}><SiteNavbar /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Quản trị' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Kết quả học viên' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Bài mẫu/ })).not.toBeInTheDocument()
  })

  it.each([
    ['/games/rooms/room-1', 'Trò chơi'],
    ['/video-dictation/video-1', 'Nghe chép'],
    ['/community/posts/post-1', 'Cộng đồng'],
    ['/vocabulary/review', 'Kho từ vựng'],
    ['/flashcards/decks/deck-1', 'Flashcard của tôi'],
  ])('keeps discovery active on %s', (path, label) => {
    render(<MemoryRouter initialEntries={[path]}><SiteNavbar /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Khám phá' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
  })

  it('opens discovery on touch and closes the mobile menu after choosing a child', () => {
    render(<MemoryRouter initialEntries={['/home']}><SiteNavbar /><LocationProbe /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Mở điều hướng' }))
    fireEvent.click(screen.getByRole('button', { name: 'Khám phá' }))
    const mobileSections = document.getElementById('site-mobile-discovery-sections')!
    fireEvent.click(within(mobileSections).getByRole('link', { name: 'Nghe chép' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/video-dictation')
    expect(screen.getByRole('button', { name: 'Mở điều hướng' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('returns focus to the mobile menu toggle on Escape', () => {
    render(<MemoryRouter initialEntries={['/home']}><SiteNavbar /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Mở điều hướng' }))
    fireEvent.click(screen.getByRole('button', { name: 'Khám phá' }))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Khám phá' }), { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Mở điều hướng' })).toHaveFocus()
  })

  it('opens discovery on hover and dismisses the preview when clicking outside the header', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/home']}><SiteNavbar /><button>Phần nội dung</button></MemoryRouter>)
    const trigger = screen.getByRole('button', { name: 'Khám phá' })
    await user.hover(trigger)
    expect(trigger).toHaveClass('active')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', { name: 'Khám phá' })).toBeInTheDocument()
    await user.click(trigger)
    expect(screen.getByRole('navigation', { name: 'Khám phá' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Phần nội dung' }))
    expect(screen.queryByRole('navigation', { name: 'Khám phá' })).not.toBeInTheDocument()
  })
})
