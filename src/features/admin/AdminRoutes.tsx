import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { RequireRole } from '@/features/auth/AuthGuards'
import { useAuthSession } from '@/features/auth/authSession'
import { hasAnyRole, signInDestination, STAFF_ROLES, type StaffArea } from '@/features/auth/staffRoles'
import { rolesFor } from './adminMenu'
import { AdminLayout } from './AdminLayout'
import { AdminForbiddenPage } from './pages/AdminForbiddenPage'
import { KnowledgeGraphPage } from './knowledge-graph/pages/KnowledgeGraphPage'
import { OverviewPage } from './overview/pages/OverviewPage'
import { UsersPage } from './users/pages/UsersPage'
import { ServicesPage } from './system/pages/ServicesPage'
import { ActivityPage } from './system/pages/ActivityPage'
import { SystemOverviewPage } from './system/pages/SystemOverviewPage'
import { QuestionBankPage } from './questions/pages/QuestionBankPage'
import { QuestionDetailPage } from './questions/pages/QuestionDetailPage'
import { CoursesPage } from './courses/pages/CoursesPage'
import { RubricsPage } from './rubrics/pages/RubricsPage'
import { ErrorTypesPage } from './error-types/pages/ErrorTypesPage'
import { PackagesPage } from './packages/pages/PackagesPage'
import { PackageEditorPage } from './packages/pages/PackageEditorPage'
import { AiDraftsPage } from './ai-drafts/pages/AiDraftsPage'
import { AiDraftDetailPage } from './ai-drafts/pages/AiDraftDetailPage'
import { CourseDraftsPage } from './course-drafts/pages/CourseDraftsPage'
import { CourseDraftDetailPage } from './course-drafts/pages/CourseDraftDetailPage'
import { CourseImportPage } from './course-import/pages/CourseImportPage'
import { WorkQueuePage } from './work-queue/pages/WorkQueuePage'
import { ExaminerReviewPage } from './examiner-review/pages/ExaminerReviewPage'
import { ReviewEssayPage } from './examiner-review/pages/ReviewEssayPage'
import { ExaminerDashboardPage } from '@/features/examiner/dashboard/pages/ExaminerDashboardPage'
import { ExaminerProfilePage } from '@/features/examiner/dashboard/pages/ExaminerProfilePage'
import { GradedReviewPage } from '@/features/examiner/grading/pages/GradedReviewPage'
import { SpeakingGradingPage } from '@/features/examiner/grading/pages/SpeakingGradingPage'
import { WritingGradingPage } from '@/features/examiner/grading/pages/WritingGradingPage'
import { WritingQueuePage } from '@/features/examiner/grading/pages/WritingQueuePage'
import { AiEvaluationPage } from './ai-evaluation/pages/AiEvaluationPage'
import { EvaluationRunPage } from './ai-evaluation/pages/EvaluationRunPage'
import { AdminVocabularyPage } from './vocabulary/pages/AdminVocabularyPage'

/** A route is open only to the roles its menu item lists. */
function Guard({ path, children }: { path: string; children: ReactNode }) {
  return <RequireRole fallback={<AdminForbiddenPage />} roles={rolesFor(path)}>{children}</RequireRole>
}

/** Old admin entry links forward staff to the workspace for their role. */
function AdminHome() {
  const { roles } = useAuthSession()
  const destination = signInDestination(roles)
  return <Navigate replace to={destination === '/admin' ? '/admin/system' : destination} />
}

function LegacyContentRedirect() {
  const { pathname, search, hash } = useLocation()
  const destination = pathname.replace(/^\/admin(?=\/|$)/, '/content-author').replace(/^\/content-author\/content\/?$/, '/content-author')
  return <Navigate replace to={`${destination}${search}${hash}`} />
}

function LegacyExaminerRedirect() {
  const { pathname, search, hash } = useLocation()
  const destination = pathname
    .replace(/^\/admin\/examiner(?=\/|$)/, '/examiner')
    .replace(/^\/admin\/grading(?=\/|$)/, '/examiner/grading')
  return <Navigate replace to={`${destination}${search}${hash}`} />
}

function LegacyKnowledgeGraph() {
  const { roles } = useAuthSession()
  const { search, hash } = useLocation()
  const area = hasAnyRole(roles, ['CONTENT_AUTHOR']) ? 'content-author' : 'examiner'
  return <Navigate replace to={`/${area}/knowledge-graph${search}${hash}`} />
}

function LegacyVocabulary() {
  const { roles } = useAuthSession()
  return hasAnyRole(roles, ['ADMIN']) ? <AdminVocabularyPage /> : <LegacyContentRedirect />
}

export function AdminRoutes({ area = 'admin' }: { area?: StaffArea }) {
  const isAuthorArea = area === 'content-author'
  const isExaminerArea = area === 'examiner'
  const areaRoles = isAuthorArea ? ['CONTENT_AUTHOR'] : isExaminerArea ? ['EXAMINER'] : STAFF_ROLES
  return (
    <Routes>
      <Route element={<RequireRole fallback={<AdminForbiddenPage />} roles={areaRoles}><AdminLayout area={area} /></RequireRole>}>
        <Route element={isAuthorArea ? <OverviewPage /> : isExaminerArea ? <ExaminerDashboardPage /> : <AdminHome />} index />
        {isExaminerArea ? <>
          <Route element={<ExaminerProfilePage />} path="profile" />
          <Route element={<KnowledgeGraphPage />} path="knowledge-graph" />
          <Route element={<WritingQueuePage />} path="grading/writing" />
          <Route element={<WritingGradingPage />} path="grading/writing/:jobId" />
          <Route element={<GradedReviewPage />} path="grading/writing/:jobId/review" />
          <Route element={<SpeakingGradingPage />} path="grading/speaking" />
        </> : isAuthorArea ? <>
          <Route element={<LegacyContentRedirect />} path="content" />
          <Route element={<CoursesPage />} path="courses" />
          <Route element={<RubricsPage />} path="rubrics" />
          <Route element={<ErrorTypesPage />} path="error-types" />
          <Route element={<Outlet />} path="ai-drafts">
            <Route element={<AiDraftsPage />} index />
            <Route element={<AiDraftDetailPage />} path=":draftId" />
          </Route>
          <Route element={<Outlet />} path="packages">
            <Route element={<PackagesPage />} index />
            <Route element={<PackageEditorPage />} path=":packageId" />
          </Route>
          <Route element={<Outlet />} path="course-drafts">
            <Route element={<CourseDraftsPage />} index />
            <Route element={<CourseDraftDetailPage />} path=":draftId" />
          </Route>
          <Route element={<AdminVocabularyPage />} path="vocabulary" />
          <Route element={<CourseImportPage />} path="course-import" />
          <Route element={<WorkQueuePage />} path="work-items" />
          <Route element={<Outlet />} path="examiner-review">
            <Route element={<ExaminerReviewPage />} index />
            <Route element={<ReviewEssayPage />} path=":jobId" />
          </Route>
          <Route element={<Outlet />} path="ai-evaluation">
            <Route element={<AiEvaluationPage />} index />
            <Route element={<EvaluationRunPage />} path="runs/:runId" />
          </Route>
          <Route element={<KnowledgeGraphPage />} path="knowledge-graph" />
          <Route element={<Outlet />} path="questions">
            <Route element={<QuestionBankPage />} index />
            <Route element={<QuestionDetailPage />} path=":questionId" />
          </Route>
        </> : <>
          <Route element={<Guard path="/admin/system"><SystemOverviewPage /></Guard>} path="system" />
          <Route element={<Guard path="/admin/users"><UsersPage /></Guard>} path="users" />
          <Route element={<Guard path="/admin/services"><ServicesPage /></Guard>} path="services" />
          <Route element={<Guard path="/admin/activity"><ActivityPage /></Guard>} path="activity" />
          <Route element={<Guard path="/examiner"><LegacyExaminerRedirect /></Guard>} path="examiner/*" />
          <Route element={<Guard path="/examiner"><LegacyExaminerRedirect /></Guard>} path="grading/*" />
          <Route element={<Guard path="/admin/vocabulary"><LegacyVocabulary /></Guard>} path="vocabulary" />
          <Route element={<Guard path="/admin/content"><LegacyContentRedirect /></Guard>} path="content" />
          <Route element={<Guard path="/admin/knowledge-graph"><LegacyKnowledgeGraph /></Guard>} path="knowledge-graph" />
          <Route element={<Guard path="/admin/content"><Navigate replace to="/content-author/courses" /></Guard>} path="lessons/*" />
          <Route element={<Guard path="/admin/questions"><LegacyContentRedirect /></Guard>} path="questions/*" />
        </>}
        <Route element={<Navigate replace to={`/${area}`} />} path="*" />
      </Route>
    </Routes>
  )
}
