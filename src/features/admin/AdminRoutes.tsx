import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { RequireRole } from '@/features/auth/AuthGuards'
import { useAuthSession } from '@/features/auth/authSession'
import { hasAnyRole, STAFF_ROLES } from '@/features/auth/staffRoles'
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
import { CoursesPage } from './courses/pages/CoursesPage'
import { RubricsPage } from './rubrics/pages/RubricsPage'

/** A route is open only to the roles its menu item lists. */
function Guard({ path, children }: { path: string; children: ReactNode }) {
  return <RequireRole fallback={<AdminForbiddenPage />} roles={rolesFor(path)}>{children}</RequireRole>
}

/** Each workspace forwards staff to their first available menu item. */
function AdminHome() {
  const { roles } = useAuthSession()
  const first = menuFor(roles)[0]
  return first ? <Navigate replace to={first.path} /> : <AdminForbiddenPage />
}

function LegacyContentRedirect() {
  const { pathname, search, hash } = useLocation()
  return <Navigate replace to={`${pathname.replace(/^\/admin/, '/content-author')}${search}${hash}`} />
}

function LegacyKnowledgeGraph() {
  const { roles } = useAuthSession()
  return hasAnyRole(roles, ['CONTENT_AUTHOR']) ? <LegacyContentRedirect /> : <KnowledgeGraphPage />
}

export function AdminRoutes({ area = 'admin' }: { area?: 'admin' | 'content-author' }) {
  const isAuthorArea = area === 'content-author'
  return (
    <Routes>
      <Route element={<RequireRole fallback={<AdminForbiddenPage />} roles={isAuthorArea ? ['CONTENT_AUTHOR'] : STAFF_ROLES}><AdminLayout /></RequireRole>}>
        <Route element={isAuthorArea ? <Navigate replace to="/content-author/content" /> : <AdminHome />} index />
        {isAuthorArea ? <>
          <Route element={<OverviewPage />} path="content" />
          <Route element={<CoursesPage />} path="courses" />
          <Route element={<RubricsPage />} path="rubrics" />
          <Route element={<KnowledgeGraphPage />} path="knowledge-graph" />
          <Route element={<Outlet />} path="lessons">
            <Route element={<LessonsPage />} index />
            <Route element={<LessonEditorPage />} path=":lessonId" />
          </Route>
          <Route element={<Outlet />} path="questions">
            <Route element={<QuestionBankPage />} index />
            <Route element={<QuestionDetailPage />} path=":questionId" />
          </Route>
        </> : <>
          <Route element={<Guard path="/admin/system"><SystemOverviewPage /></Guard>} path="system" />
          <Route element={<Guard path="/admin/users"><UsersPage /></Guard>} path="users" />
          <Route element={<Guard path="/admin/services"><ServicesPage /></Guard>} path="services" />
          <Route element={<Guard path="/admin/activity"><ActivityPage /></Guard>} path="activity" />
          <Route element={<Guard path="/admin/content"><LegacyContentRedirect /></Guard>} path="content" />
          <Route element={<Guard path="/admin/knowledge-graph"><LegacyKnowledgeGraph /></Guard>} path="knowledge-graph" />
          <Route element={<Guard path="/admin/lessons"><LegacyContentRedirect /></Guard>} path="lessons/*" />
          <Route element={<Guard path="/admin/questions"><LegacyContentRedirect /></Guard>} path="questions/*" />
        </>}
        <Route element={<Navigate replace to={`/${area}`} />} path="*" />
      </Route>
    </Routes>
  )
}
