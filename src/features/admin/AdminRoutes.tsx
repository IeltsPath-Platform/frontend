import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { RequireRole } from '@/features/auth/AuthGuards'
import { useAuthSession } from '@/features/auth/authSession'
import { STAFF_ROLES } from '@/features/auth/staffRoles'
import { menuFor, rolesFor } from './adminMenu'
import { AdminLayout } from './AdminLayout'
import { KnowledgeGraphPage } from './knowledge-graph/pages/KnowledgeGraphPage'
import { LessonEditorPage } from './lessons/pages/LessonEditorPage'
import { LessonsPage } from './lessons/pages/LessonsPage'
import { OverviewPage } from './overview/pages/OverviewPage'
import { QuestionBankPage } from './questions/pages/QuestionBankPage'
import { QuestionDetailPage } from './questions/pages/QuestionDetailPage'
import { AdminForbiddenPage } from './pages/AdminForbiddenPage'

/** A route is open only to the roles its menu item lists. */
function Guard({ path, children }: { path: string; children: ReactNode }) {
  return <RequireRole fallback={<AdminForbiddenPage />} roles={rolesFor(path)}>{children}</RequireRole>
}

/** `/admin` shows the overview to authors; a role without it lands on its first allowed screen. */
function AdminHome() {
  const { roles } = useAuthSession()
  const first = menuFor(roles)[0]
  if (first && first.path !== '/admin') return <Navigate replace to={first.path} />
  return <OverviewPage />
}

export function AdminRoutes() {
  return (
    <Routes>
      <Route element={<RequireRole fallback={<AdminForbiddenPage />} roles={STAFF_ROLES}><AdminLayout /></RequireRole>}>
        <Route element={<AdminHome />} index />
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
