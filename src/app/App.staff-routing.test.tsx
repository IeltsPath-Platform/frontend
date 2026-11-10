import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { Link, useSearchParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('@/features/auth/authSession', async (original) => ({
  ...await original<typeof import('@/features/auth/authSession')>(),
  useAuthSession: auth,
  hydrateAuthSession: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/features/examiner/dashboard/pages/ExaminerDashboardPage', () => ({
  ExaminerDashboardPage: () => <h1>Tổng quan chấm bài</h1>,
}))
vi.mock('@/features/admin/overview/pages/OverviewPage', () => ({
  OverviewPage: () => <h1>Tổng quan nội dung</h1>,
}))
vi.mock('@/features/community/components/NotificationBell', () => ({ NotificationBell: () => null }))
vi.mock('@/components/SiteFooter', () => ({ SiteFooter: () => <footer>Chân trang học viên</footer> }))
vi.mock('@/components/OwlMascot', () => ({ OwlMascot: () => <div>Linh vật học viên</div> }))
vi.mock('@/features/overview/pages/OverviewPage', () => ({
  OverviewPage: () => {
    const [params, setParams] = useSearchParams()
    return <>
      <button onClick={() => setParams({ tab: 'detailed-stats', skill: params.get('skill') === 'WRITING' ? 'READING' : 'WRITING' })}>Đổi kỹ năng</button>
      <Link to="/missing-page">Trang khác</Link>
    </>
  },
}))

describe('staff workspace entry through the application router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  it.each([
    ['EXAMINER', '/', '/examiner', 'Tổng quan chấm bài'],
    ['EXAMINER', '/login', '/examiner', 'Tổng quan chấm bài'],
    ['EXAMINER', '/admin', '/examiner', 'Tổng quan chấm bài'],
    ['EXAMINER', '/examiner', '/examiner', 'Tổng quan chấm bài'],
    ['CONTENT_AUTHOR', '/', '/content-author', 'Tổng quan nội dung'],
    ['CONTENT_AUTHOR', '/login', '/content-author', 'Tổng quan nội dung'],
    ['CONTENT_AUTHOR', '/admin', '/content-author', 'Tổng quan nội dung'],
    ['CONTENT_AUTHOR', '/content-author', '/content-author', 'Tổng quan nội dung'],
  ])('opens the %s dashboard from %s with its own frame', (role, entry, home, heading) => {
    auth.mockReturnValue({
      isLoggedIn: true, hydrated: true, roles: [role], userName: 'Nhân viên',
      email: null, userId: null, avatarUrl: null, points: 0, tier: 'FREE',
    })
    window.history.replaceState(null, '', entry)
    render(<App />)

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    expect(window.location.pathname).toBe(home)
    expect(screen.queryByText('Chân trang học viên')).not.toBeInTheDocument()
    expect(screen.queryByText('Linh vật học viên')).not.toBeInTheDocument()
  })

  it('does not grant a content author access to the examiner workspace', () => {
    auth.mockReturnValue({ isLoggedIn: true, hydrated: true, roles: ['CONTENT_AUTHOR'] })
    window.history.replaceState(null, '', '/examiner')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tổng quan chấm bài' })).not.toBeInTheDocument()
  })

  it('keeps the scroll position for the first and subsequent skill filters but resets it for another page', async () => {
    const user = userEvent.setup()
    auth.mockReturnValue({ isLoggedIn: true, hydrated: true, roles: [], userName: 'Học viên', email: null, userId: null, avatarUrl: null, points: 0, tier: 'FREE' })
    window.history.replaceState(null, '', '/overview?tab=detailed-stats')
    render(<App />)
    vi.mocked(window.scrollTo).mockClear()
    await user.click(screen.getByRole('button', { name: 'Đổi kỹ năng' }))
    expect(window.location.search).toContain('skill=WRITING')
    expect(window.scrollTo).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Đổi kỹ năng' }))
    expect(window.location.search).toContain('skill=READING')
    expect(window.scrollTo).not.toHaveBeenCalled()
    await user.click(screen.getByRole('link', { name: 'Trang khác' }))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
  })
})
