import { lazy, Suspense } from "react"
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from "react-router-dom"
import { MainLayout } from "@/components/layouts/MainLayout"
import { Spinner } from "@/components/ui/spinner"
import { useAuthStore } from "@/features/auth/store/useAuthStore"
import { LoginPage } from "@/features/auth/pages/LoginPage"
import { RegisterPage } from "@/features/auth/pages/RegisterPage"
import { AiAssistantPage } from "@/features/ai-assistant/pages/AiAssistantPage"
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage"
import { ExamHubPage } from "@/features/exam/pages/ExamHubPage"
import { ExamTestingPage } from "@/features/exam/pages/ExamTestingPage"

const LandingPage = lazy(async () => ({ default: (await import("@/features/landing/pages/LandingPage")).LandingPage }))

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isInitialLoading = useAuthStore((state) => state.isInitialLoading)

  if (isInitialLoading) return <main className="route-loading"><Spinner className="size-6" /> Đang mở không gian học tập…</main>
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth/login" replace />
}

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/home" replace /> },
  { path: "/home", element: <Suspense fallback={<main className="route-loading">Đang mở trang chủ…</main>}><LandingPage /></Suspense> },
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
          { path: "/exams", element: <ExamHubPage /> },
          { path: "/assistant", element: <AiAssistantPage /> },
        ],
      },
      { path: "/exams/:examId/start", element: <ExamTestingPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/home" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
