import { Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { useAuthSession } from '@/features/auth/authSession'
import { menuFor } from './adminMenu'
import { AdminSearchProvider } from './AdminSearchProvider'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'
import './admin.css'

/** The admin area's own frame. It never renders the learner site navigation or footer. */
export function AdminLayout() {
  const { roles } = useAuthSession()
  const { pathname } = useLocation()
  return (
    <AdminSearchProvider>
      <div className="adm-theme adm-shell">
        <a className="adm-skip" href="#admin-main">Bỏ qua điều hướng</a>
        <AdminTopbar />
        <AdminSidebar items={menuFor(roles)} />
        <main className="adm-main" id="admin-main">
          <ErrorBoundary key={pathname} title="Không thể hiển thị trang quản trị">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </AdminSearchProvider>
  )
}
