import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { SiteNavbar } from '@/components/SiteNavbar'
import { isMockLearning, learningApi } from '../api'
import { setPendingReviews } from '../lib/reviewGate'
import { useScrollToTop } from '../lib/useScrollToTop'
import { DemoControls } from './DemoControls'
import '../learning-path.css'
import '../lesson-resources.css'
import '../guide.css'

export function LearnLayout() {
  const { pathname } = useLocation()
  useScrollToTop()

  useEffect(() => {
    if (!isMockLearning) return
    let active = true
    learningApi.getPendingReviews().then(
      (reviews) => { if (active) setPendingReviews(reviews) },
      () => { /* Pending reviews will sync again from a later learning response. */ },
    )
    return () => { active = false }
  }, [])

  return (
    <>
      <a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a>
      <SiteNavbar />
      <div className="lp-root">
        <main id="main-content" tabIndex={-1} className="lp-main lp-shell">
          <ErrorBoundary key={pathname} title="Không thể hiển thị lộ trình học">
            <Outlet />
          </ErrorBoundary>
        </main>
        {isMockLearning ? <DemoControls /> : null}
      </div>
    </>
  )
}
