import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminRoutes } from './AdminRoutes'

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: auth, logoutSession: vi.fn() }))
vi.mock('./overview/pages/OverviewPage', () => ({ OverviewPage: () => <h1>Tổng quan</h1> }))
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

  it('gives an author the shell with the four menu items and no learner footer', () => {
    auth.mockReturnValue(session(['CONTENT_AUTHOR']))
    renderAt('/admin')

    const menu = screen.getByRole('navigation', { name: 'Menu quản trị' })
    for (const label of ['Tổng quan', 'Cây tri thức', 'Bài học', 'Ngân hàng câu hỏi']) {
      expect(menu).toHaveTextContent(label)
    }
    expect(screen.getByText('QUẢN TRỊ')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tổng quan' })).toBeInTheDocument()
  })

  it('explains the missing role to a learner', () => {
    auth.mockReturnValue(session(['CUSTOMER']))
    renderAt('/admin')

    expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Menu quản trị' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang học' })).toHaveAttribute('href', '/overview')
  })

  it('sends an examiner from the overview to the screen it may open', () => {
    auth.mockReturnValue(session(['EXAMINER']))
    renderAt('/admin')

    const menu = screen.getByRole('navigation', { name: 'Menu quản trị' })
    expect(menu).toHaveTextContent('Cây tri thức')
    expect(menu).not.toHaveTextContent('Bài học')
    expect(screen.getByRole('heading', { name: 'Cây tri thức' })).toBeInTheDocument()
  })

  it('blocks a screen the role does not own even inside the shell', () => {
    auth.mockReturnValue(session(['EXAMINER']))
    renderAt('/admin/lessons')

    expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument()
  })
})
