import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { RequireRole } from '@/features/auth/AuthGuards'
import { useAuthSession } from '@/features/auth/authSession'
import { STAFF_ROLES } from '@/features/auth/staffRoles'
import { menuFor, rolesFor } from './adminMenu'
import { AdminLayout } from './AdminLayout'
import { AdminForbiddenPage } from './pages/AdminForbiddenPage'
import { KnowledgeGraphPage } from './knowledge-graph/pages/KnowledgeGraphPage'
import { LessonEditorPage } from './lessons/pages/LessonEditorPage'
import { LessonsPage } from './lessons/pages/LessonsPage'
import { OverviewPage } from './overview/pages/OverviewPage'
import { UsersPage } from './users/pages/UsersPage'
import { ServicesPage } from './system/pages/ServicesPage'
import { ActivityPage } from './system/pages/ActivityPage'
import { SystemOverviewPage } from './system/pages/SystemOverviewPage'
import { QuestionBankPage } from './questions/pages/QuestionBankPage'
import { QuestionDetailPage } from './questions/pages/QuestionDetailPage'

/** A route is open only to the roles its menu item lists. */
function Guard({ path, children }: { path: string; children: ReactNode }) {
  return <RequireRole fallback={<AdminForbiddenPage />} roles={rolesFor(path)}>{children}</RequireRole>
}

/** `/admin` forwards each staff role to its first available menu item. */
function AdminHome() {
  const { roles } = useAuthSession()
  const first = menuFor(roles)[0]
  return first ? <Navigate replace to={first.path} /> : <AdminForbiddenPage />
}

export function AdminRoutes() {
  return (
    <Routes>
      <Route element={<RequireRole fallback={<AdminForbiddenPage />} roles={STAFF_ROLES}><AdminLayout /></RequireRole>}>
        <Route element={<AdminHome />} index />
        <Route element={<Guard path="/admin/system"><SystemOverviewPage /></Guard>} path="system" />
        <Route element={<Guard path="/admin/users"><UsersPage /></Guard>} path="users" />
        <Route element={<Guard path="/admin/services"><ServicesPage /></Guard>} path="services" />
        <Route element={<Guard path="/admin/activity"><ActivityPage /></Guard>} path="activity" />
        <Route element={<Guard path="/admin/content"><OverviewPage /></Guard>} path="content" />
        <Route element={<Guard path="/admin/knowledge-graph"><KnowledgeGraphPage /></Guard>} path="knowledge-graph" />
        <Route element={<Guard path="/admin/lessons"><Outlet /></Guard>} path="lessons">
          <Route element={<LessonsPage />} index />
          <Route element={<LessonEditorPage />} path=":lessonId" />
        </Route>
        <Route element={<Guard path="/admin/questions"><Outlet /></Guard>} path="questions">
          <Route element={<QuestionBankPage />} index />
          <Route element={<QuestionDetailPage />} path=":questionId" />
        </Route>
        <Route element={<Navigate replace to="/admin" />} path="*" />
      </Route>
    </Routes>
  )
}
