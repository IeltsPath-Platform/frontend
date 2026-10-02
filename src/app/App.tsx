import { BrowserRouter, Navigate, Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'
import { NotFoundPage, RouteStatusPage } from './RouteStatusPage'
import { ClassroomPage } from '~features/classroom/ClassroomPage'
import { LessonWorkspacePage } from '~features/classroom/pages/LessonWorkspacePage'
import { OverviewPage } from '@/features/overview/pages/OverviewPage'
import { PracticeCatalogPage } from '@/features/practice/pages/PracticeCatalogPage'
import { PracticeTestPage } from '@/features/practice/pages/PracticeTestPage'
import { ListeningPage } from '@/features/practice/pages/ListeningPage'
import { WritingPage } from '@/features/practice/pages/WritingPage'
import { SpeakingPage } from '@/features/practice/pages/SpeakingPage'
import { HomePage } from '@/features/home/HomePage'
import { VocabularyPage } from '@/features/vocabulary/pages/VocabularyPage'
import { AuthPage } from '@/features/auth/pages/AuthPage'
import { useAuthSession } from '@/features/auth/authSession'
import { SiteFooter } from '@/components/SiteFooter'
import { getPracticeMode } from '@/features/practice/lib/passageTools'
import type { PracticeMode, SkillType } from '@/types/practice'
import './app.css'
import '@/features/practice/practice.css'

function AppContent() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuthSession()

  return (
    <>
      <Routes>
      <Route path="/" element={<Navigate replace to={isLoggedIn ? '/overview' : '/home'} />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/overview" element={<OverviewPage />} />
      <Route path="/classroom" element={<ClassroomPage />} />
      <Route
        path="/practice"
        element={<RouteStatusPage title="Thực hành" />}
      />
      <Route
        path="/practice-tests"
        element={
          <PracticeCatalogPage
            onOpenTest={(skill: SkillType, id: string, mode: PracticeMode) => {
              const route = skill === 'reading' ? `/practice/test/${id}` : `/practice/${skill}/${id}`
              navigate(`${route}?mode=${mode}`)
            }}
          />
        }
      />
      <Route
        path="/practice/test/:testId"
        element={<PracticeTestRouteWrapper onExit={() => navigate('/practice-tests')} />}
      />
      <Route
        path="/practice/test"
        element={<PracticeTestRouteWrapper onExit={() => navigate('/practice-tests')} />}
      />
      <Route
        path="/practice/listening/:testId"
        element={<ListeningPage onExit={() => navigate('/practice-tests')} />}
      />
      <Route
        path="/practice/writing/:taskId"
        element={<WritingPage onExit={() => navigate('/practice-tests')} />}
      />
      <Route
        path="/practice/speaking/:cueId"
        element={<SpeakingPage onExit={() => navigate('/practice-tests')} />}
      />
      <Route path="/vocabulary" element={<VocabularyPage />} />
      <Route path="/materials" element={<RouteStatusPage title="Học liệu" />} />
      <Route path="/login" element={<AuthPage mode="sign-in" />} />
      <Route path="/register" element={<AuthPage mode="sign-up" />} />
      <Route path="/classes/:classCode/join" element={<RouteStatusPage title="Phòng học trực tuyến" />} />
      <Route path="/lessons/:lessonId" element={<LessonWorkspacePage />} />
      <Route path="/mentors/:mentorSlug" element={<RouteStatusPage title="Liên hệ Mentor" />} />
      <Route path="/terms" element={<RouteStatusPage title="Điều khoản sử dụng" />} />
      <Route path="/privacy" element={<RouteStatusPage title="Chính sách bảo mật" />} />
      <Route path="/copyright" element={<RouteStatusPage title="Chính sách bản quyền" />} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <SiteFooter />
    </>
  )
}

function PracticeTestRouteWrapper({ onExit }: { onExit: () => void }) {
  const { testId } = useParams()
  const [search] = useSearchParams()
  const mode = getPracticeMode(search.get('mode'))
  return <PracticeTestPage key={`${testId ?? 'snow-makers'}-${mode}`} testId={testId} mode={mode} onExit={onExit} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
