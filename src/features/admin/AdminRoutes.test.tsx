import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminRoutes } from './AdminRoutes'

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: auth, logoutSession: vi.fn() }))
vi.mock('./overview/pages/OverviewPage', () => ({ OverviewPage: () => <h1>Tổng quan nội dung</h1> }))
vi.mock('./knowledge-graph/pages/KnowledgeGraphPage', () => ({ KnowledgeGraphPage: () => <h1>Cây tri thức</h1> }))

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route element={<AdminRoutes />} path="/admin/*" />
      </Routes>
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
})
