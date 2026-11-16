import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { Loading, type LoadingVariant } from '@/components/loading/Loading'
import { NotFoundArt } from '@/components/NotFoundArt'
import { StatusArt } from '@/components/StatusArt'
import { Button } from '@/components/ui/button'
import type { ApiError } from '../api/apiError'
import { topicPagePath } from '../lib/routes'

/** The loading look of the app lives in `@/components/loading`; these two keep the names the learning pages already use. */
export function LoadingState({ label = 'Đang tải…' }: { label?: string }) {
  return <Loading label={label} variant="block" />
}

export function PageSkeleton({ label = 'Đang tải…', variant = 'article' }: { label?: string; variant?: LoadingVariant }) {
  return <Loading label={label} variant={variant} />
}
export function EmptyState({
  title = 'Chưa có nội dung',
  description = 'Không tìm thấy dữ liệu phù hợp với bộ lọc hiện tại.',
  actionLabel,
  onAction,
}: {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <StatusArt compact headingId="lp-empty-title" kind="empty" message={description} title={title}>
      {actionLabel && onAction ? (
        <Button className="lp-btn lp-btn--accent" onClick={onAction} type="button">
          {actionLabel}
        </Button>
      ) : null}
    </StatusArt>
  )
}

export function CourseCatalogSkeleton() {
  return (
    <div className="lp-skeleton-catalog" aria-busy="true" aria-label="Đang tải danh sách khóa học…">
      <div className="lp-skeleton-featured">
        <div className="lp-skeleton-box lp-skeleton-band" />
        <div className="lp-skeleton-content">
          <div className="lp-skeleton-line lp-skeleton-line--short" />
          <div className="lp-skeleton-line lp-skeleton-line--title" />
          <div className="lp-skeleton-line lp-skeleton-line--desc" />
          <div className="lp-skeleton-line lp-skeleton-line--progress" />
        </div>
        <div className="lp-skeleton-box lp-skeleton-btn" />
      </div>
      <div className="lp-skeleton-grid">
        {[1, 2, 3].map((key) => (
          <div className="lp-skeleton-card" key={key}>
            <div className="lp-skeleton-card__head">
              <div className="lp-skeleton-box lp-skeleton-pill" />
              <div className="lp-skeleton-box lp-skeleton-chip" />
            </div>
            <div className="lp-skeleton-line lp-skeleton-line--title" />
            <div className="lp-skeleton-line lp-skeleton-line--desc" />
            <div className="lp-skeleton-line lp-skeleton-line--progress" />
            <div className="lp-skeleton-box lp-skeleton-card__cta" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TopicListSkeleton() {
  return (
    <div className="lp-skeleton-topics" aria-busy="true" aria-label="Đang tải lộ trình chặng học…">
      <div className="lp-skeleton-head">
        <div className="lp-skeleton-line lp-skeleton-line--short" />
        <div className="lp-skeleton-line lp-skeleton-line--title" />
        <div className="lp-skeleton-line lp-skeleton-line--desc" />
      </div>
      <div className="lp-skeleton-trail">
        {[1, 2, 3, 4].map((key) => (
          <div className="lp-skeleton-node" key={key}>
            <div className="lp-skeleton-box lp-skeleton-node__dot" />
            <div className="lp-skeleton-node__card">
              <div className="lp-skeleton-line lp-skeleton-line--short" />
              <div className="lp-skeleton-line lp-skeleton-line--title" />
              <div className="lp-skeleton-line lp-skeleton-line--desc" />
              <div className="lp-skeleton-line lp-skeleton-line--progress" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function NotFoundState({ message = 'Nội dung này không tồn tại hoặc đã bị gỡ.' }: { message?: string }) {
  return (
    <NotFoundArt headingId="lp-not-found" message={message} title="Không tìm thấy trang">
      <Button asChild className="lp-btn"><Link to="/learn">Về lộ trình</Link></Button>
    </NotFoundArt>
  )
}

export interface NavigationNotice {
  notice: string
}

/**
 * Renders a page-level load error. Lock errors redirect to the nearest valid screen with a notice;
 * REVIEW_REQUIRED is surfaced by the global review banner.
 */
export function ApiErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const navigate = useNavigate()
  const redirect = lockRedirect(error)
  const redirectTo = redirect?.to
  const redirectNotice = redirect?.notice

  useEffect(() => {
    if (redirectTo && redirectNotice) {
      navigate(redirectTo, { replace: true, state: { notice: redirectNotice } satisfies NavigationNotice })
    }
  }, [navigate, redirectTo, redirectNotice])

  if (redirect) return <LoadingState label="Đang chuyển về màn hợp lệ…" />
  if (error.code === 'NOT_FOUND') return <NotFoundState />
  if (error.code === 'REVIEW_REQUIRED') {
    const review = error.details.reviews?.[0]
    const topicPath = error.details.topicId ? topicPagePath(error.details.topicId) : '/learn'
    return (
      <StatusArt
        headingId="lp-review-required"
        kind="locked"
        message={`Làm xong bài ôn${review ? ` “${review.knowledgePointTitle}”` : ''} trước, bài học sẽ tự mở lại.`}
        page
        title="Nội dung này đang tạm khóa"
      >
        {review ? (
          <Button asChild className="lp-btn lp-btn--accent lp-btn--cta">
            <Link to={`/learn/reviews/${review.reviewId}`}>Làm bài ôn</Link>
          </Button>
        ) : null}
        <Link className="lp-state__link" to={topicPath}>Về danh sách bài</Link>
      </StatusArt>
    )
  }
  return (
    <StatusArt
      kind="error"
      message={`${error.status >= 500 || error.status === 0 ? 'Máy chủ đang gặp sự cố hoặc mất kết nối.' : error.message} Hãy thử lại.`}
      page
      title="Chưa tải được nội dung"
    >
      <Button className="lp-btn" onClick={onRetry} type="button"><RotateCcw aria-hidden="true" />Thử lại</Button>
    </StatusArt>
  )
}
function lockRedirect(error: ApiError): { to: string; notice: string } | null {
  if (error.code === 'TOPIC_LOCKED') return { to: '/learn', notice: 'Topic đó chưa mở. Hãy hoàn thành chặng trước.' }
  const topicPath = error.details.topicId ? topicPagePath(error.details.topicId) : '/learn'
  if (error.code === 'LESSON_LOCKED') return { to: topicPath, notice: 'Bài này mở khi bạn đạt phần Luyện tập của bài trước.' }
  if (error.code === 'TEST_LOCKED') return { to: topicPath, notice: 'Bài kiểm tra chưa mở. Hoàn thành mọi bài học trước.' }
  return null
}
