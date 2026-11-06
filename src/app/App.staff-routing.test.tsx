import { render, screen } from '@/test/render'
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
})
