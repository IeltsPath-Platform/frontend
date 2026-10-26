import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminRoutes } from './AdminRoutes'

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: auth, logoutSession: vi.fn() }))
vi.mock('./overview/pages/OverviewPage', () => ({ OverviewPage: () => <h1>Tổng quan nội dung</h1> }))
vi.mock('./knowledge-graph/pages/KnowledgeGraphPage', () => ({ KnowledgeGraphPage: () => <h1>Cây tri thức</h1> }))
vi.mock('./lessons/pages/LessonEditorPage', () => ({ LessonEditorPage: () => <h1>Biên soạn bài học</h1> }))
vi.mock('./packages/api/packageApi', async (original) => ({ ...await original<typeof import('./packages/api/packageApi')>(), listPackages: vi.fn().mockResolvedValue([]) }))
vi.mock('./ai-drafts/api/aiDraftApi', async (original) => ({ ...await original<typeof import('./ai-drafts/api/aiDraftApi')>(), fetchAiDrafts: vi.fn().mockResolvedValue([]) }))
vi.mock('./courses/api/courseApi', async (original) => ({ ...await original<typeof import('./courses/api/courseApi')>(), fetchCourses: vi.fn().mockResolvedValue([]) }))
vi.mock('./lessons/api/lessonApi', async (original) => ({ ...await original<typeof import('./lessons/api/lessonApi')>(), fetchTopics: vi.fn().mockResolvedValue([]) }))

vi.mock('@/features/community/components/NotificationBell', () => ({
  NotificationBell: ({ enabled }: { enabled: boolean }) => (enabled ? <button aria-label="Thông báo" type="button" /> : null),
}))
vi.mock('@/features/examiner/dashboard/api/examinerDashboardApi', () => ({
  getExaminerSummary: vi.fn().mockResolvedValue({ queued: 0, processing: 0, dueSoon: 0, overdue: 0, completedToday: 0, completedThisWeek: 0, receivedToday: 0, dailyLimit: 10 }),
  getMyExaminerProfile: vi.fn().mockResolvedValue({ id: '20000000-0000-4000-8000-000000000001', displayName: 'Lê Hiếu', avatarUrl: null, bio: null, ieltsBand: 8, certificates: [], acceptingSubmissions: true }),
  saveExaminerProfile: vi.fn(),
}))
vi.mock('@/features/examiner/grading/api/examinerGradingApi', async (original) => ({
  ...await original<typeof import('@/features/examiner/grading/api/examinerGradingApi')>(),
  listMyGradingJobs: vi.fn().mockResolvedValue({ content: [], page: 0, size: 20, totalElements: 0 }),
  listMyOpenGradingJobs: vi.fn().mockResolvedValue({ entries: [], truncated: false }),
}))

function LocationProbe() {
  const { pathname, search, hash } = useLocation()
  return <output data-testid="location">{pathname}{search}{hash}</output>
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route element={<AdminRoutes />} path="/admin/*" />
        <Route element={<AdminRoutes area="content-author" />} path="/content-author/*" />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

function session(roles: string[]) {
  return { isLoggedIn: true, hydrated: true, roles, userName: 'Lê Hiếu', email: 'hieu@example.com' }
}

describe('AdminRoutes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('redirects administrators to the system overview and shows only system links', () => {
    auth.mockReturnValue(session(['ADMIN']))
    renderAt('/admin')

    const menu = screen.getByRole('navigation', { name: 'Menu quản trị' })
    expect(menu).toHaveTextContent('Tổng quan hệ thống')
    expect(menu).toHaveTextContent('Người dùng')
    expect(menu).toHaveTextContent('Dịch vụ')
    expect(menu).toHaveTextContent('Hoạt động')
    expect(menu).not.toHaveTextContent('Bài học')
    expect(screen.getByRole('heading', { name: 'Tổng quan hệ thống' })).toBeInTheDocument()
    expect(screen.getByText('QUẢN TRỊ')).toBeInTheDocument()
  })

  it('redirects content authors to their content overview and shows only content links', () => {
    auth.mockReturnValue(session(['CONTENT_AUTHOR']))
    renderAt('/admin')

    const menu = screen.getByRole('navigation', { name: 'Menu quản trị' })
    expect(menu).toHaveTextContent('Tổng quan nội dung')
    expect(menu).toHaveTextContent('Cây tri thức')
    expect(menu).toHaveTextContent('Bài học')
    expect(menu).toHaveTextContent('Ngân hàng câu hỏi')
    expect(menu).not.toHaveTextContent('Người dùng')
    expect(screen.getByRole('heading', { name: 'Tổng quan nội dung' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/content-author/content')
    expect(screen.getByRole('link', { name: 'Trang chủ biên soạn nội dung' })).toHaveAttribute('href', '/content-author')
    expect(screen.getByText('BIÊN SOẠN')).toBeInTheDocument()
  })

  it('redirects examiners to their dashboard and shows grading, their profile and the knowledge graph in the menu', () => {
    auth.mockReturnValue(session(['EXAMINER']))
    renderAt('/admin')

    const menu = screen.getByRole('navigation', { name: 'Menu quản trị' })
    expect(menu).toHaveTextContent('Tổng quan chấm bài')
    // The grading links are in the menu itself, not behind a group that opens on hover.
    expect(within(menu).getByRole('link', { name: 'Chấm Writing' })).toHaveAttribute('href', '/admin/grading/writing')
    expect(within(menu).getByRole('link', { name: 'Chấm Speaking' })).toHaveAttribute('href', '/admin/grading/speaking')
    expect(menu).toHaveTextContent('Chấm Writing')
    expect(menu).toHaveTextContent('Chấm Speaking')
    expect(menu).not.toHaveTextContent('Hồ sơ của tôi')
    expect(menu).toHaveTextContent('Cây tri thức')
    expect(menu).not.toHaveTextContent('Bài học')
    expect(menu).not.toHaveTextContent('Người dùng')
    expect(screen.getByRole('heading', { name: 'Xin chào Lê Hiếu' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/examiner')
  })

  it('gives examiners the notification bell, where they are reminded of jobs that will be late, and nobody else', () => {
    auth.mockReturnValue(session(['EXAMINER']))
    const examiner = renderAt('/admin')
    expect(screen.getByRole('button', { name: 'Thông báo' })).toBeInTheDocument()
    examiner.unmount()

    for (const role of ['ADMIN', 'CONTENT_AUTHOR']) {
      auth.mockReturnValue(session([role]))
      const other = renderAt(role === 'ADMIN' ? '/admin' : '/content-author')
      expect(screen.queryByRole('button', { name: 'Thông báo' })).not.toBeInTheDocument()
      other.unmount()
    }
  })

  it('opens the examiner profile screen for examiners only', () => {
    auth.mockReturnValue(session(['EXAMINER']))
    renderAt('/admin/examiner/profile')
    expect(screen.getByRole('heading', { name: 'Hồ sơ của tôi' })).toBeInTheDocument()
  })

  it.each(['ADMIN', 'CONTENT_AUTHOR', 'CUSTOMER'])('does not grant %s access to the examiner dashboard or profile', (role) => {
    auth.mockReturnValue(session([role]))
    for (const url of ['/admin/examiner', '/admin/examiner/profile']) {
      const view = renderAt(url)
      expect(screen.queryByRole('heading', { name: /Xin chào|Hồ sơ của tôi/ })).not.toBeInTheDocument()
      view.unmount()
    }
  })

  it('lets an examiner choose between Writing and Speaking from the menu', () => {
    auth.mockReturnValue(session(['EXAMINER']))
    renderAt('/admin/grading/speaking')

    expect(screen.getByRole('heading', { name: 'Chấm Speaking' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Chấm Writing' })).toHaveAttribute('href', '/admin/grading/writing')
    expect(screen.getByRole('link', { name: 'Chấm Speaking' })).toHaveAttribute('href', '/admin/grading/speaking')
  })

  it.each(['ADMIN', 'CONTENT_AUTHOR', 'CUSTOMER'])('does not grant %s access to the grading screens', (role) => {
    auth.mockReturnValue(session([role]))
    renderAt('/admin/grading/writing')

    expect(screen.queryByRole('heading', { name: 'Danh sách bài chờ chấm Writing' })).not.toBeInTheDocument()
  })

  it('denies administrators access to content author routes', () => {
    auth.mockReturnValue(session(['ADMIN']))
    renderAt('/admin/lessons')

    expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
  })

  it('denies content authors access to user management', () => {
    auth.mockReturnValue(session(['CONTENT_AUTHOR']))
    renderAt('/admin/users')

    expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
  })

  it('explains the missing role to a learner', () => {
    auth.mockReturnValue(session(['CUSTOMER']))
    renderAt('/admin')

    expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Menu quản trị' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang học' })).toHaveAttribute('href', '/overview')
  })

  it('opens the content author workspace directly', () => {
    auth.mockReturnValue(session(['CONTENT_AUTHOR']))
    renderAt('/content-author')
    expect(screen.getByRole('heading', { name: 'Tổng quan nội dung' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bài học' })).toHaveAttribute('href', '/content-author/lessons')
  })

  it('opens question generation for an author and lists it in the menu', () => {
    auth.mockReturnValue(session(['CONTENT_AUTHOR']))
    renderAt('/content-author/ai-drafts')
    expect(screen.getByRole('heading', { name: 'Sinh nội dung bằng AI' })).toBeInTheDocument()
    expect(screen.queryByText('Tính năng đang chờ triển khai')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sinh nội dung bằng AI' })).toHaveAttribute('href', '/content-author/ai-drafts')
  })

  it.each(['ADMIN', 'CUSTOMER', 'EXAMINER'])('does not grant %s access to question draft routes', (role) => {
    auth.mockReturnValue(session([role]))
    renderAt('/content-author/ai-drafts')
    expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
    expect(screen.queryByText('Tính năng đang chờ triển khai')).not.toBeInTheDocument()
  })

  it('does not add a legacy admin alias for question draft routes', () => {
    auth.mockReturnValue(session(['CONTENT_AUTHOR']))
    renderAt('/admin/ai-drafts')
    expect(screen.getByRole('heading', { name: 'Tổng quan nội dung' })).toBeInTheDocument()
    expect(screen.queryByText('Tính năng đang chờ triển khai')).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/content-author/content')
  })

  it('opens the package workspace for a content author', () => {
    auth.mockReturnValue(session(['CONTENT_AUTHOR']))
    renderAt('/content-author/packages')
    expect(screen.getByRole('heading', { name: 'Đề & gói câu hỏi' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gói mới' })).toBeInTheDocument()
  })

  it.each(['ADMIN', 'CUSTOMER', 'EXAMINER'])('denies %s access to the package workspace', (role) => {
    auth.mockReturnValue(session([role]))
    renderAt('/content-author/packages')
    expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Mở gói có sẵn' })).not.toBeInTheDocument()
  })

  it('redirects legacy lesson details without losing the query or fragment', () => {
    auth.mockReturnValue(session(['CONTENT_AUTHOR']))
    renderAt('/admin/lessons/lesson-1?view=questions#question-2')
    expect(screen.getByRole('heading', { name: 'Biên soạn bài học' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/content-author/lessons/lesson-1?view=questions#question-2')
  })

  it.each(['ADMIN', 'CUSTOMER', 'EXAMINER'])('does not grant %s access to the content author workspace', (role) => {
    auth.mockReturnValue(session([role]))
    renderAt('/content-author/lessons/lesson-1')
    expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Biên soạn bài học' })).not.toBeInTheDocument()
  })
})
