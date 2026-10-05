import { Link, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { usePendingReviews } from '../lib/reviewGate'

export function ReviewGateBanner() {
  const reviews = usePendingReviews()
  const { pathname } = useLocation()
  const first = reviews[0]
  if (!first || pathname.startsWith('/learn/reviews/')) return null

  return (
    <section className="lp-gate" role="alert" aria-labelledby="lp-gate-title">
      <div className="lp-shell lp-gate__inner">
        <span className="lp-gate__icon"><ShieldAlert aria-hidden="true" size={22} /></span>
        <div className="lp-gate__copy">
          <h2 id="lp-gate-title">Cần ôn lại trước khi học tiếp</h2>
          <p>
            Bạn còn {reviews.length} bài ôn bắt buộc. Bắt đầu với "{first.knowledgePointTitle}" để mở bài kế tiếp.
          </p>
        </div>
        <Link className="lp-gate__action" to={`/learn/reviews/${first.reviewId}`}>Làm bài ôn</Link>
      </div>
    </section>
  )
}
