import { lazy, Suspense } from "react"
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from "react-router-dom"
import { MainLayout } from "@/components/layouts/MainLayout"
import { PublicShell } from "@/components/layouts/PublicShell"
import { Spinner } from "@/components/ui/spinner"
import { useAuthStore } from "@/features/auth/store/useAuthStore"
import { LoginPage } from "@/features/auth/pages/LoginPage"
import { RegisterPage } from "@/features/auth/pages/RegisterPage"
import { AiAssistantPage } from "@/features/ai-assistant/pages/AiAssistantPage"
import { ArticlePage, BlogPage } from "@/features/blog/pages/BlogPages"
import { CommunityPage } from "@/features/community/pages/CommunityPage"
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage"
import { DictationPage } from "@/features/dictation/pages/DictationPage"
import { ExamResultPage } from "@/features/exam/pages/ExamResultPage"
import { ExamTestingPage } from "@/features/exam/pages/ExamTestingPage"
import { PracticePage } from "@/features/practice/pages/PracticePage"
import { RoadmapPage } from "@/features/roadmap/pages/RoadmapPage"
import { VocabularyPage } from "@/features/vocabulary/pages/VocabularyPage"

const LandingPage = lazy(async () => ({ default: (await import("@/features/landing/pages/LandingPage")).LandingPage }))

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isInitialLoading = useAuthStore((state) => state.isInitialLoading)

  if (isInitialLoading) return <main className="route-loading"><Spinner className="size-6" /> Đang mở không gian học tập…</main>
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth/login" replace />
}

const router = createBrowserRouter([
  {
    element: <PublicShell />,
    children: [
      { path: "/", element: <Navigate to="/home" replace /> },
      { path: "/home", element: <Suspense fallback={<main className="route-loading">Đang mở trang chủ…</main>}><LandingPage /></Suspense> },
      { path: "/practice", element: <PracticePage /> },
      { path: "/roadmap", element: <RoadmapPage /> },
      { path: "/vocabulary", element: <VocabularyPage /> },
      { path: "/dictation", element: <DictationPage /> },
      { path: "/community", element: <CommunityPage /> },
      { path: "/blog", element: <BlogPage /> },
      { path: "/blog/:slug", element: <ArticlePage /> },
      { path: "/exams", element: <Navigate to="/practice" replace /> },
    ],
  },
  { path: "/auth/login", element: <LoginPage /> },
  { path: "/auth/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/assistant", element: <AiAssistantPage /> },
        ],
      },
      { path: "/exams/:examId/start", element: <ExamTestingPage /> },
      {
        element: <PublicShell />,
        children: [{ path: "/exams/:examId/result", element: <ExamResultPage /> }],
      },
    ],
  },
  { path: "*", element: <Navigate to="/home" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
