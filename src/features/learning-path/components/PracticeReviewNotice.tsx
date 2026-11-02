import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PracticeReviewCreated } from '~types/learningPath'
import type { ReviewOrigin } from '../lib/routes'

/** What a Practice submission created: a blocking review stops the learner, a suggestion only invites a review. */
export function PracticeReviewNotice({ created, reviewOrigin }: {
  created: PracticeReviewCreated[]
  reviewOrigin?: ReviewOrigin
}) {
  const blocking = created.find((review) => review.blocking)
  const first = blocking ?? created[0]
  if (!first) return null
  const state = reviewOrigin ? { reviewOrigin } : undefined
  return blocking ? (
    <div className="lp-done lp-done--review" role="status">
      <p>Đã tạo bài ôn bắt buộc sau lần luyện này.</p>
      <Button asChild className="lp-btn lp-btn--accent lp-btn--cta">
        <Link to={`/learn/reviews/${first.reviewId}`} state={state}>Làm bài ôn<ArrowRight aria-hidden="true" /></Link>
      </Button>
    </div>
  ) : (
    <div className="lp-done lp-done--review" role="status">
      <p>Nên ôn lại {created.length} điểm kiến thức còn yếu. Bạn vẫn học tiếp được.</p>
      <Button asChild className="lp-btn">
        <Link to={`/learn/reviews/${first.reviewId}`} state={state}>Ôn ngay<ArrowRight aria-hidden="true" /></Link>
      </Button>
    </div>
  )
}
