import { GameLayout } from '@/features/games/components/GameLayout'
import { GameCatalogPage } from '@/features/games/pages/GameCatalogPage'
import { GameSetupPage } from '@/features/games/pages/GameSetupPage'
import { GameRoomPage } from '@/features/games/pages/GameRoomPage'
import { WordlyPlayPage } from '@/features/games/pages/WordlyPlayPage'
import { GameResultPage } from '@/features/games/pages/GameResultPage'
import { lazy, Suspense } from 'react'
import { USE_MOCK_ROCKET } from '@/lib/env'
import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AdminRoutes } from '@/features/admin/AdminRoutes'
import { ErrorBoundary } from './ErrorBoundary'
import { NotFoundPage, RouteStatusPage } from './RouteStatusPage'
import { OverviewPage } from '@/features/overview/pages/OverviewPage'
import { PracticeCatalogPage } from '@/features/practice/pages/PracticeCatalogPage'
import { ListeningPracticePage } from '@/features/practice/listening/ListeningPracticePage'
import { WritingWorkspacePage } from '@/features/practice/writing/WritingWorkspacePage'
import { WritingResultPage } from '@/features/practice/writing/WritingResultPage'
import { SpeakingWorkspacePage } from '@/features/practice/speaking/SpeakingWorkspacePage'
import { ReadingPracticePage } from '@/features/practice/reading/ReadingPracticePage'
import { ReadingResultPage } from '@/features/practice/reading/ReadingResultPage'
import { ReadingHistoryPage } from '@/features/practice/reading/ReadingHistoryPage'
import { HomePage } from '@/features/home/HomePage'
import { DeckDetailPage } from '@/features/flashcards/pages/DeckDetailPage'
import { DeckEditorPage } from '@/features/flashcards/pages/DeckEditorPage'
import { LearnPage } from '@/features/flashcards/pages/LearnPage'
import { TestPage } from '@/features/flashcards/pages/TestPage'
import { FlashcardStudyPage } from '@/features/flashcards/pages/FlashcardStudyPage'
import { FlashcardsPage } from '@/features/flashcards/pages/FlashcardsPage'
import { VocabularyPage } from '@/features/vocabulary/pages/VocabularyPage'
import { VocabularyReviewPage } from '@/features/vocabulary/pages/VocabularyReviewPage'
import { AuthPage } from '@/features/auth/pages/AuthPage'
import { useAuthSession } from '@/features/auth/authSession'
import { signInDestination } from '@/features/auth/staffRoles'
import { SiteFooter } from '@/components/SiteFooter'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { OAuthCallbackPage } from '@/features/auth/pages/OAuthCallbackPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ToastProvider } from '@/components/toast/ToastProvider'
import { GuestOnly, RequireAuth } from '@/features/auth/AuthGuards'
import { LearnLayout } from '@/features/learning-path/components/LearnLayout'
import { NotFoundState } from '@/features/learning-path/components/PageState'
import { CourseListPage } from '@/features/learning-path/pages/CourseListPage'
import { FreePracticePage } from '@/features/learning-path/pages/FreePracticePage'
import { KnowledgeTreePage } from '@/features/learning-path/pages/KnowledgeTreePage'
import { LessonPage } from '@/features/learning-path/pages/LessonPage'
import { PlacementPage } from '@/features/learning-path/pages/PlacementPage'
import { ProgressPage } from '@/features/learning-path/pages/ProgressPage'
import { ReviewBasketPage } from '@/features/learning-path/pages/ReviewBasketPage'
import { ReviewPage } from '@/features/learning-path/pages/ReviewPage'
import { TopicPage } from '@/features/learning-path/pages/TopicPage'
import { TopicListPage } from '@/features/learning-path/pages/TopicListPage'
import { TopicTestPage } from '@/features/learning-path/pages/TopicTestPage'
import { TopicTestResultPage } from '@/features/learning-path/pages/TopicTestResultPage'
import { VideoDictationLibraryPage } from '@/features/video-dictation/pages/VideoDictationLibraryPage'
import { VideoDictationPlayerPage } from '@/features/video-dictation/pages/VideoDictationPlayerPage'
import { CommunityPage } from '@/features/community/pages/CommunityPage'
import { NotificationPreferencesPage } from '@/features/community/pages/NotificationPreferencesPage'
import { ContentReportsAdminPage } from '@/features/community/pages/ContentReportsAdminPage'
import type { PracticeMode, SkillType } from '@/types/practice'
import './app.css'
import '@/features/practice/practice.css'

const RocketGamePage = lazy(() =>
  import('@/features/games/rocket/pages/RocketGamePage').then((module) => ({ default: module.RocketGamePage })),
)

/** Full-screen game without the site navbar; the mock needs no sign-in so the UI can be reviewed offline. */
function RocketRoute() {
  const page = (
    <ErrorBoundary>
      <Suspense fallback={<div className="min-h-dvh bg-[#04195c]" role="status" aria-label="Đang tải trò chơi" />}>
        <RocketGamePage />
      </Suspense>
    </ErrorBoundary>
  )
  return USE_MOCK_ROCKET ? page : <RequireAuth>{page}</RequireAuth>
}

function AppContent() {
  const navigate = useNavigate()
  const { isLoggedIn, roles } = useAuthSession()
  // The admin area has its own frame, so the learner footer stays out of it.
  const { pathname } = useLocation()
  const inAdminArea = ['/admin', '/content-author'].some((base) => pathname === base || pathname.startsWith(`${base}/`))

  return (
    <>
      <Routes>
      <Route path="/" element={<Navigate replace to={isLoggedIn ? signInDestination(roles) : '/home'} />} />
      <Route path="/games/rocket" element={<RocketRoute />} />
      <Route path="/games/rocket/:matchId" element={<RocketRoute />} />
      <Route path="/admin/*" element={<RequireAuth><AdminRoutes /></RequireAuth>} />
      <Route path="/content-author/*" element={<RequireAuth><AdminRoutes area="content-author" /></RequireAuth>} />
      <Route path="/games" element={<RequireAuth><GameLayout /></RequireAuth>}>
        <Route index element={<GameCatalogPage />} />
        <Route path="wordly/setup" element={<GameSetupPage />} />
        <Route path="rooms/:roomId" element={<GameRoomPage />} />
        <Route path="matches/:matchId/play" element={<WordlyPlayPage />} />
        <Route path="matches/:matchId/result" element={<GameResultPage />} />
      </Route>
      <Route path="/home" element={<HomePage />} />
      <Route path="/overview" element={<RequireAuth><OverviewPage /></RequireAuth>} />
      <Route path="/community" element={<RequireAuth><CommunityPage /></RequireAuth>} />
      <Route path="/community/admin/reports" element={<RequireAuth><ContentReportsAdminPage /></RequireAuth>} />
      <Route path="/notifications/preferences" element={<RequireAuth><NotificationPreferencesPage /></RequireAuth>} />
      <Route path="/community/posts/:postId" element={<RequireAuth><CommunityPage /></RequireAuth>} />
      <Route path="/community/users/:userId" element={<RequireAuth><CommunityPage /></RequireAuth>} />
      <Route path="/vocabulary/review" element={<RequireAuth><VocabularyReviewPage /></RequireAuth>} />
      <Route path="/learn" element={<RequireAuth><LearnLayout /></RequireAuth>}>
        <Route index element={<CourseListPage />} />
        <Route path="placement" element={<PlacementPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="review-basket" element={<ReviewBasketPage />} />
        <Route path="courses/:courseId" element={<TopicListPage />} />
        <Route path="courses/:courseId/tree" element={<KnowledgeTreePage />} />
        <Route path="practice/:attemptId" element={<FreePracticePage />} />
        <Route path="topics/:topicId" element={<TopicPage />} />
        <Route path="lessons/:lessonId" element={<LessonPage />} />
        <Route path="lessons/:lessonId/practice" element={<LessonPracticeRedirect />} />
        <Route path="reviews/:reviewId" element={<ReviewPage />} />
        <Route path="tests/:attemptId" element={<TopicTestPage />} />
        <Route path="tests/:attemptId/result" element={<TopicTestResultPage />} />
        <Route path="*" element={<NotFoundState />} />
      </Route>
      <Route
        path="/practice"
        element={<RequireAuth><RouteStatusPage title="Thực hành" /></RequireAuth>}
      />
      <Route
        path="/practice-tests"
        element={
          <RequireAuth>
            <PracticeCatalogRoute onOpenTest={(skill: SkillType, id: string, mode: PracticeMode) => {
              const route = `/practice/${skill}/${id}`
              navigate(`${route}?mode=${mode}`)
            }} />
          </RequireAuth>
        }
      />
      <Route path="/practice/reading" element={<Navigate replace to="/practice-tests?skill=reading" />} />
      <Route path="/practice/reading/attempts/:attemptId" element={<RequireAuth><ReadingPracticePage /></RequireAuth>} />
      <Route path="/practice/reading/attempts/:attemptId/result" element={<RequireAuth><ReadingResultPage /></RequireAuth>} />
      <Route path="/practice/reading/attempts/:attemptId/review" element={<RequireAuth><ReadingResultPage review /></RequireAuth>} />
      <Route path="/practice/listening/attempts/:attemptId" element={<RequireAuth><ListeningPracticePage /></RequireAuth>} />
      <Route path="/practice/listening/attempts/:attemptId/result" element={<RequireAuth><ReadingResultPage skill="listening" /></RequireAuth>} />
      <Route path="/practice/listening/attempts/:attemptId/review" element={<RequireAuth><ReadingResultPage skill="listening" review /></RequireAuth>} />
      <Route path="/practice/writing/tasks/:packageVersionId/:sectionId" element={<RequireAuth><WritingWorkspacePage /></RequireAuth>} />
      <Route path="/practice/writing/submissions/:submissionId/result" element={<RequireAuth><WritingResultPage /></RequireAuth>} />
      <Route path="/practice/listening/:testId" element={<Navigate replace to="/practice-tests?skill=listening" />} />
      <Route path="/practice/writing/:taskId" element={<Navigate replace to="/practice-tests?skill=writing" />} />
      <Route path="/practice/reading/history" element={<RequireAuth><ReadingHistoryPage /></RequireAuth>} />
      <Route path="/practice/reading/:packageId" element={<Navigate replace to="/practice-tests?skill=reading" />} />
      <Route
        path="/practice/test/:testId"
        element={<RequireAuth><Navigate replace to="/practice-tests?skill=reading" /></RequireAuth>}
      />
      <Route
        path="/practice/test"
        element={<RequireAuth><Navigate replace to="/practice-tests?skill=reading" /></RequireAuth>}
      />
      <Route path="/practice/speaking/tasks/:packageVersionId/:sectionId" element={<RequireAuth><SpeakingWorkspacePage /></RequireAuth>} />
      <Route path="/practice/speaking/:cueId" element={<Navigate replace to="/practice-tests?skill=speaking" />} />
      <Route path="/video-dictation" element={<RequireAuth><VideoDictationLibraryPage /></RequireAuth>} />
      <Route path="/video-dictation/:videoId" element={<RequireAuth><VideoDictationPlayerPage /></RequireAuth>} />
      <Route path="/vocabulary" element={<VocabularyPage />} />
      <Route path="/submission-history" element={<RequireAuth><RouteStatusPage title="Lịch sử nộp bài" /></RequireAuth>} />
      <Route path="/flashcards" element={<RequireAuth><FlashcardsPage /></RequireAuth>} />
      <Route path="/flashcards/decks/new" element={<RequireAuth><DeckEditorPage /></RequireAuth>} />
      <Route path="/flashcards/decks/:deckId" element={<RequireAuth><DeckDetailPage /></RequireAuth>} />
      <Route path="/flashcards/decks/:deckId/edit" element={<RequireAuth><DeckEditorPage /></RequireAuth>} />
      <Route path="/flashcards/decks/:deckId/learn" element={<RequireAuth><LearnPage /></RequireAuth>} />
      <Route path="/flashcards/decks/:deckId/test" element={<RequireAuth><TestPage /></RequireAuth>} />
      <Route path="/flashcards/study" element={<RequireAuth><FlashcardStudyPage /></RequireAuth>} />
      <Route path="/writing-samples" element={<RequireAuth><RouteStatusPage title="Bài mẫu Writing 8.0+" /></RequireAuth>} />
      <Route path="/student-results" element={<RequireAuth><RouteStatusPage title="Kết quả học viên" /></RequireAuth>} />
      <Route path="/login" element={<GuestOnly><AuthPage mode="sign-in" /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><AuthPage mode="sign-up" /></GuestOnly>} />
      <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
      <Route path="/reset-password" element={<GuestOnly><ResetPasswordPage /></GuestOnly>} />
      <Route path="/auth/oauth/callback" element={<GuestOnly><OAuthCallbackPage /></GuestOnly>} />
      <Route path="/classes/:classCode/join" element={<RouteStatusPage title="Phòng học trực tuyến" />} />
      <Route path="/lessons/:lessonId" element={<LessonRedirect />} />
      <Route path="/mentors/:mentorSlug" element={<RouteStatusPage title="Liên hệ Mentor" />} />
      <Route path="/terms" element={<RouteStatusPage title="Điều khoản sử dụng" />} />
      <Route path="/privacy" element={<RouteStatusPage title="Chính sách bảo mật" />} />
      <Route path="/copyright" element={<RouteStatusPage title="Chính sách bản quyền" />} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {inAdminArea ? null : <SiteFooter />}
    </>
  )
}

/** Lessons live in the learning area; the old top-level lesson URL forwards there. */
function LessonRedirect() {
  const { lessonId } = useParams()
  return <Navigate to={`/learn/lessons/${lessonId}`} replace />
}

/** The Practice is a part of the lesson page; the old Practice URL forwards there. */
function LessonPracticeRedirect() {
  const { lessonId } = useParams()
  return <Navigate to={`/learn/lessons/${lessonId}?view=practice`} replace />
}

function PracticeCatalogRoute({ onOpenTest }: { onOpenTest: (skill: SkillType, id: string, mode: PracticeMode) => void }) {
  return <PracticeCatalogPage onOpenTest={onOpenTest} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}
