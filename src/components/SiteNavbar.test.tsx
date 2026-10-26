import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteNavbar } from './SiteNavbar'

const { authSessionMock, basketSummaryMock } = vi.hoisted(() => ({ authSessionMock: vi.fn(), basketSummaryMock: vi.fn() }))

vi.mock('@/features/learning-path/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/learning-path/api')>()),
  learningApi: { getReviewBasketSummary: basketSummaryMock },
}))

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
    basketSummaryMock.mockReset().mockResolvedValue({ required: 0, due: 0 })
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

  it('lists the review basket with the main links for a signed-in learner, lit on its own page only', () => {
    render(<MemoryRouter initialEntries={['/learn/review-basket']}><SiteNavbar /></MemoryRouter>)
    const main = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    const labels = within(main).getAllByRole('link').map((link) => link.textContent)
    expect(labels.indexOf('Giỏ ôn tập')).toBe(labels.indexOf('Khóa học') + 1)
    const basket = within(main).getByRole('link', { name: 'Giỏ ôn tập' })
    expect(basket).toHaveAttribute('href', '/learn/review-basket')
    expect(basket).toHaveClass('active')
    expect(within(main).getByRole('link', { name: 'Khóa học' })).not.toHaveClass('active')
  })

  it('shows how much waits in the basket on its link, and nothing when it is empty', async () => {
    basketSummaryMock.mockResolvedValue({ required: 1, due: 2 })
    const { unmount } = render(<MemoryRouter initialEntries={['/home']}><SiteNavbar /></MemoryRouter>)
    const badge = await screen.findByRole('img', { name: '1 bài ôn bắt buộc, 2 bài đến hạn ôn' })
    expect(badge).toHaveTextContent('3')
    expect(screen.getByRole('link', { name: /^Giỏ ôn tập/ })).toContainElement(badge)
    unmount()

    basketSummaryMock.mockResolvedValue({ required: 0, due: 0 })
    render(<MemoryRouter initialEntries={['/home']}><SiteNavbar /></MemoryRouter>)
    await waitFor(() => expect(basketSummaryMock).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('img', { name: /bài/ })).not.toBeInTheDocument()
  })

  it('does not ask for the basket counts of a visitor', () => {
    authSessionMock.mockReturnValue({ isLoggedIn: false, userName: '' })
    render(<MemoryRouter initialEntries={['/home']}><SiteNavbar /></MemoryRouter>)
    expect(basketSummaryMock).not.toHaveBeenCalled()
  })

  it('keeps Khóa học for the other pages under /learn, and hides the basket from a visitor', () => {
    const { unmount } = render(<MemoryRouter initialEntries={['/learn/progress']}><SiteNavbar /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Giỏ ôn tập' })).not.toHaveClass('active')
    expect(screen.getAllByRole('link', { name: 'Khóa học' })[0]).toHaveClass('active')
    unmount()

    authSessionMock.mockReturnValue({ isLoggedIn: false, userName: '' })
    render(<MemoryRouter initialEntries={['/home']}><SiteNavbar /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Giỏ ôn tập' })).not.toBeInTheDocument()
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
