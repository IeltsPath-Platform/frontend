import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { SiteNavbar } from '@/components/SiteNavbar'
import { MOCK_LEARNER } from '@/mocks/learning-path/topics'
import { learningApi } from '../api'
import { setPendingReviews } from '../lib/reviewGate'
import { DemoControls } from './DemoControls'
import { ReviewGateBanner } from './ReviewGateBanner'
import '../learning-path.css'

export function LearnLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    let active = true
    learningApi.getPendingReviews().then(
      (reviews) => { if (active) setPendingReviews(reviews) },
      () => { /* A cold hydrate failure leaves the banner empty until a later response. */ },
    )
    return () => { active = false }
  }, [])

  return (
    <>
      <a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a>
      <SiteNavbar isLoggedIn userName={MOCK_LEARNER.name} />
      <div className="lp-root">
        <ReviewGateBanner />
        <main id="main-content" tabIndex={-1} className="lp-main lp-shell">
          <ErrorBoundary key={pathname} title="Không thể hiển thị lộ trình học">
            <Outlet />
          </ErrorBoundary>
        </main>
        <DemoControls />
      </div>
    </>
  )
}
