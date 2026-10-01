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
import { LearnLayout } from '@/features/learning-path/components/LearnLayout'
import { NotFoundState } from '@/features/learning-path/components/PageState'
import { LessonPage } from '@/features/learning-path/pages/LessonPage'
import { ReviewPage } from '@/features/learning-path/pages/ReviewPage'
import { TopicDetailPage } from '@/features/learning-path/pages/TopicDetailPage'
import { TopicListPage } from '@/features/learning-path/pages/TopicListPage'
import { TopicTestPage } from '@/features/learning-path/pages/TopicTestPage'
import { TopicTestResultPage } from '@/features/learning-path/pages/TopicTestResultPage'
import { getPracticeMode } from '@/features/practice/lib/passageTools'
import type { PracticeMode, SkillType } from '@/types/practice'
import './app.css'
import '@/features/practice/practice.css'

function AppContent() {
  const navigate = useNavigate()

  return (
    <Routes>
      <Route path="/" element={<Navigate replace to="/overview" />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/overview" element={<OverviewPage />} />
      <Route path="/classroom" element={<ClassroomPage />} />
      <Route path="/learn" element={<LearnLayout />}>
        <Route index element={<TopicListPage />} />
        <Route path="topics/:topicId" element={<TopicDetailPage />} />
        <Route path="lessons/:lessonId" element={<LessonPage />} />
        <Route path="reviews/:reviewId" element={<ReviewPage />} />
        <Route path="tests/:attemptId" element={<TopicTestPage />} />
        <Route path="tests/:attemptId/result" element={<TopicTestResultPage />} />
        <Route path="*" element={<NotFoundState />} />
      </Route>
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
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
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
