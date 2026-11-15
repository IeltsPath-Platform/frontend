import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TreePoint } from '~types/learningPath'
import { kindOf, type BlockingReviewInfo } from '../lib/blockingReviews'
import { skillLabel } from '../lib/courseMeta'
import { reviewPath } from '../lib/masteryGuide'
import { chapterLabel, pointSkill } from '../lib/treeMeta'
import { RelatedPoint } from './PointDetail'
import styles from './PointDetail.module.css'

/** What a review says of itself in the panel, by state: the state in words (the dot before it carries the colour), and the way in. */
const STATE = {
  PENDING: { label: 'Đang chặn tiến độ', go: 'Làm bài ôn', primary: true },
  SUGGESTED: { label: 'Gợi ý, không bắt buộc', go: 'Làm bài ôn', primary: false },
  DONE: { label: 'Đã hoàn thành', go: 'Xem lại bài ôn', primary: false },
  SKIPPED: { label: 'Đã bỏ qua', go: 'Xem lại bài ôn', primary: false },
} as const

const dateOf = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : null)

/** The sentence under the title: what the review means for the learner now, and how it went. */
function summaryOf(review: BlockingReviewInfo): string {
  const score = review.lastTotal !== null && review.lastCorrect !== null
    ? ` Lượt gần nhất: ${review.lastCorrect}/${review.lastTotal} câu đúng.`
    : ''
  const sets = review.setsAnswered > 0 ? ` Đã làm ${review.setsAnswered} lượt.` : ''
  switch (kindOf(review)) {
    case 'PENDING':
      return `Làm xong bài ôn này để mở các bài học tiếp theo.${sets}${score}`
    case 'SUGGESTED':
      return 'Hệ thống gợi ý ôn lại điểm này vì bạn làm chưa tốt. Bạn có thể làm ngay hoặc để sau, bài ôn này không chặn bài học. '
        + 'Nếu điểm này vẫn yếu ở lần luyện sau, hoặc bạn làm bài ôn mà chưa đạt, bài ôn sẽ trở thành bắt buộc.'
    case 'DONE':
      return `Bạn đã hoàn thành bài ôn${dateOf(review.doneAt) ? ` ngày ${dateOf(review.doneAt)}` : ''}.${sets}${score}`
    case 'SKIPPED':
      return 'Bài ôn được bỏ qua vì không còn bộ đề ôn nào bạn chưa làm, nên bạn vẫn học tiếp được.'
  }
}

/**
 * The panel under the chart for a review picked on the map: which point it is for, what state it is in, where it came from, and the
 * way into it, with the order of learning around it the way a point's panel has it (the point it follows, what it holds back).
 * A review stays on the map once it is done, so the panel is there for a finished one too.
 */
export function ReviewDetail({ review, point, dependents, onSelect }: {
  review: BlockingReviewInfo
  /** The point the review is for. */
  point: TreePoint
  /** What builds on that point, which the review stands in front of. */
  dependents: TreePoint[]
  onSelect: (id: string) => void
}) {
  const kind = kindOf(review)
  const state = STATE[kind]
  const lesson = review.lessonId ? point.lessons?.find((row) => row.lessonId === review.lessonId) : undefined
  const skill = skillLabel(pointSkill(point)) ?? pointSkill(point)
  const created = dateOf(review.createdAt)
  const beforeId = `${review.reviewId}-before`
  const afterId = `${review.reviewId}-after`

  return (
    <aside aria-label="Chi tiết bài ôn" className={styles.detail} data-review={kind} id="lp-point-detail">
      <div className={styles.about}>
        <header className={styles.head}>
          <p className={styles.kicker}>{skill} · Bài ôn</p>
          <h3>Ôn: {point.name}</h3>
          <p className={styles.code}>
            {point.cefrLevel ? <span>{point.cefrLevel}</span> : null}
            <span>{point.code}</span>
          </p>
        </header>

        <p className={styles.status}>
          <span className={styles.state}>{state.label}</span>
          <span>{summaryOf(review)}</span>
        </p>
        {lesson || created ? (
          <p className={styles.canDo}>
            {lesson ? `Sinh ra từ bài “${lesson.title}” (${chapterLabel(lesson.topicPosition)}, bài ${lesson.position}).` : ''}
            {lesson && created ? ' ' : ''}
            {created ? `Tạo ngày ${created}.` : ''}
          </p>
        ) : null}
      </div>

      <div className={styles.path}>
        <div className={styles.order}>
          <section aria-labelledby={beforeId} className={styles.links}>
            <h4 id={beforeId}>Xây trên (học trước)</h4>
            <ul><RelatedPoint direction="before" from={point} onSelect={onSelect} other={point} /></ul>
          </section>
          <p className={styles.here}>Bài ôn đang xem</p>
          <section aria-labelledby={afterId} className={styles.links}>
            <h4 id={afterId}>Mở ra (học sau)</h4>
            {dependents.length > 0
              ? <ul>{dependents.map((other) => <RelatedPoint direction="after" from={point} key={other.knowledgePointId} onSelect={onSelect} other={other} />)}</ul>
              : <p>Chưa có điểm nào xây trên điểm này.</p>}
          </section>
        </div>

        <div className={styles.action}>
          <Button asChild className={`lp-btn ${styles.act}`} variant={state.primary ? 'default' : 'outline'}>
            <Link to={reviewPath(review.reviewId)}>
              {state.go}
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </Button>
        </div>
      </div>
    </aside>
  )
}
