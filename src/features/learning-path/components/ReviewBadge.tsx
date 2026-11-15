import { Lightbulb, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { ReviewKind } from '../lib/blockingReviews'
import styles from './ReviewBadge.module.css'

/**
 * Marks a knowledge point by its review: "Cần ôn" while a blocking review still holds the learner back, "Nên ôn" when the system
 * only suggests one, "Đã ôn" once a blocking one is done; a skipped review marks nothing. Small enough for the head of a row next
 * to the Free badge; an icon and words, not colour alone, and a longer phrase for a screen reader.
 */
export function ReviewBadge({ kind }: { kind: ReviewKind }) {
  if (kind === 'SKIPPED') return null
  if (kind === 'DONE') {
    return (
      <span className={`${styles.badge} ${styles.done}`} title="Bài ôn của điểm này đã hoàn thành">
        <ShieldCheck aria-hidden="true" size={11} strokeWidth={2.6} />
        Đã ôn
        <span className="lp-sr-only"> (bài ôn đã hoàn thành)</span>
      </span>
    )
  }
  if (kind === 'SUGGESTED') {
    return (
      <span className={`${styles.badge} ${styles.suggested}`} title="Có bài ôn gợi ý cho điểm này, không bắt buộc">
        <Lightbulb aria-hidden="true" size={11} strokeWidth={2.6} />
        Nên ôn
        <span className="lp-sr-only"> (bài ôn gợi ý, không bắt buộc)</span>
      </span>
    )
  }
  return (
    <span className={styles.badge} title="Có bài ôn đang chặn tiến độ: làm xong để mở các bài học tiếp theo">
      <ShieldAlert aria-hidden="true" size={11} strokeWidth={2.6} />
      Cần ôn
      <span className="lp-sr-only"> (bài ôn đang chặn tiến độ)</span>
    </span>
  )
}
