import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SiteNavbar } from '@/components/SiteNavbar'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import '../games.css'

export function GameLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="games-shell">
      <SiteNavbar />
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </div>
  )
}
