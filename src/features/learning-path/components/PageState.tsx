import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, FileQuestion, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiError } from '../api/apiError'

export function LoadingState({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="lp-state" role="status" aria-live="polite">
      <Loader2 aria-hidden="true" className="lp-spin" size={22} />
      <p>{label}</p>
    </div>
  )
}

export function NotFoundState({ message = 'Nội dung này không tồn tại hoặc đã bị gỡ.' }: { message?: string }) {
  return (
    <section className="lp-state lp-state--panel" aria-labelledby="lp-not-found">
      <FileQuestion aria-hidden="true" size={28} />
      <h1 id="lp-not-found">Không tìm thấy trang</h1>
      <p>{message}</p>
      <Button asChild className="lp-btn"><Link to="/learn">Về lộ trình</Link></Button>
    </section>
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
    return (
      <section className="lp-state lp-state--panel" aria-labelledby="lp-review-required">
        <AlertTriangle aria-hidden="true" size={28} />
        <h1 id="lp-review-required">Cần ôn lại trước khi học tiếp</h1>
        <p>Hoàn thành bài ôn {review ? `"${review.knowledgePointTitle}"` : ''} để mở nội dung này.</p>
        {review ? <Button asChild className="lp-btn"><Link to={`/learn/reviews/${review.reviewId}`}>Làm bài ôn</Link></Button> : null}
      </section>
    )
  }
  return (
    <section className="lp-state lp-state--panel" role="alert">
      <AlertTriangle aria-hidden="true" size={28} />
      <h1>Chưa tải được nội dung</h1>
      <p>{error.status >= 500 || error.status === 0 ? 'Máy chủ đang gặp sự cố hoặc mất kết nối.' : error.message} Hãy thử lại.</p>
      <Button className="lp-btn" onClick={onRetry} type="button"><RotateCcw aria-hidden="true" />Thử lại</Button>
    </section>
  )
}

function lockRedirect(error: ApiError): { to: string; notice: string } | null {
  if (error.code === 'TOPIC_LOCKED') return { to: '/learn', notice: 'Topic đó chưa mở. Hãy hoàn thành chặng trước.' }
  const topicPath = error.details.topicId ? `/learn/topics/${error.details.topicId}` : '/learn'
  if (error.code === 'LESSON_LOCKED') return { to: topicPath, notice: 'Bài học đó chưa mở. Hãy học theo thứ tự.' }
  if (error.code === 'TEST_LOCKED') return { to: topicPath, notice: 'Bài kiểm tra chưa mở. Hoàn thành mọi bài học trước.' }
  return null
}
