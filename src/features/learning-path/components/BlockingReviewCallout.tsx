import { Link } from 'react-router-dom'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TreePoint } from '~types/learningPath'
import { holdsBack, useBlockingReview } from '../lib/blockingReviews'
import { reviewPath } from '../lib/masteryGuide'
import { chapterLabel } from '../lib/treeMeta'
import styles from './BlockingReviewCallout.module.css'

/**
 * The review that holds the learner back on this point, with the way into it, for the list of a narrow screen where the review
 * has no node of its own. Says which lesson raised it when the tree knows that lesson, so the learner sees why the course stopped
 * there. Nothing when the point has no review that still holds the learner back.
 */
export function BlockingReviewCallout({ point }: { point: TreePoint }) {
  const review = useBlockingReview(point.knowledgePointId)
  if (!review || !holdsBack(review)) return null
  const lesson = review.lessonId ? point.lessons?.find((row) => row.lessonId === review.lessonId) : undefined
  const titleId = `${point.knowledgePointId}-review`
  return (
    <section aria-labelledby={titleId} className={styles.callout}>
      <ShieldAlert aria-hidden="true" className={styles.icon} size={20} />
      <div className={styles.copy}>
        <h4 id={titleId}>Bài ôn đang chặn tiến độ</h4>
        <p>
          Làm xong bài ôn này để mở các bài học tiếp theo.
          {lesson ? ` Sinh ra từ bài “${lesson.title}” (${chapterLabel(lesson.topicPosition)}, bài ${lesson.position}).` : ''}
        </p>
      </div>
      <Button asChild className={`lp-btn ${styles.go}`}>
        <Link to={reviewPath(review.reviewId)}>
          Làm bài ôn
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </Button>
    </section>
  )
}
