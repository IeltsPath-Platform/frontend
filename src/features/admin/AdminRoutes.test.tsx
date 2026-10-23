import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminRoutes } from './AdminRoutes'

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: auth, logoutSession: vi.fn() }))
vi.mock('./overview/pages/OverviewPage', () => ({ OverviewPage: () => <h1>Tổng quan nội dung</h1> }))
vi.mock('./knowledge-graph/pages/KnowledgeGraphPage', () => ({ KnowledgeGraphPage: () => <h1>Cây tri thức</h1> }))
vi.mock('./lessons/pages/LessonEditorPage', () => ({ LessonEditorPage: () => <h1>Biên soạn bài học</h1> }))

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

  it('redirects examiners to the knowledge graph', () => {
    auth.mockReturnValue(session(['EXAMINER']))
    renderAt('/admin')

    const menu = screen.getByRole('navigation', { name: 'Menu quản trị' })
    expect(menu).toHaveTextContent('Cây tri thức')
    expect(menu).not.toHaveTextContent('Bài học')
    expect(screen.getByRole('heading', { name: 'Cây tri thức' })).toBeInTheDocument()
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

  it.each(['/content-author/ai-drafts', '/content-author/ai-drafts/10000000-0000-4000-8000-000000000001'])('shows the rollout placeholder for an author opening %s', (path) => {
    auth.mockReturnValue(session(['CONTENT_AUTHOR']))
    renderAt(path)
    expect(screen.getByText('Tính năng đang chờ triển khai')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sinh nội dung bằng AI' })).not.toBeInTheDocument()
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
    expect(screen.getByRole('form', { name: 'Mở gói có sẵn' })).toBeInTheDocument()
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
