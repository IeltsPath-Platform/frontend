import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { reloadSessionPoints, useAuthSession } from '@/features/auth/authSession'
import type { LessonCompletionResult, LessonDetail } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { USE_MOCK_LEARNING } from '@/lib/env'
import { BlockList } from '../components/blocks/BlockList'
import type { BlockRenderContext } from '../components/blocks/blockRegistry'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { isExerciseBlock } from '../lib/blockGuards'
import { newRequestId } from '../lib/requestId'
import { reportApiError, setPendingReviews, usePendingReviews } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'
import { useSyncPendingReviews } from '../lib/useSyncPendingReviews'

export function LessonPage() {
  const { lessonId = '' } = useParams()
  const resource = useApiResource(`lesson:${lessonId}`, () => learningApi.getLesson(lessonId))
  useSyncPendingReviews(resource.status === 'success' ? resource.data?.pendingReviews : undefined)

  if (resource.status === 'loading') return <LoadingState label="Đang tải bài học…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  return <LessonView key={resource.data.id} lesson={resource.data} />
}

function LessonView({ lesson }: { lesson: LessonDetail }) {
  const { points } = useAuthSession()
  const [completion, setCompletion] = useState<LessonCompletionResult | null>(null)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const completeInFlight = useRef(false)
  const hasExercise = lesson.blocks.some(isExerciseBlock)
  const done = completion !== null || lesson.status === 'COMPLETED'

  const context: BlockRenderContext = {
    pointsBalance: points,
    async submitExercise(block, answers) {
      try {
        const result = await learningApi.submitExercise(lesson.id, block.id, { requestId: newRequestId(), answers })
        if (result.pendingReviews.length > 0 || USE_MOCK_LEARNING) setPendingReviews(result.pendingReviews)
        if (result.lessonCompleted) setCompletion(result)
        return result
      } catch (reason) {
        const apiError = toApiError(reason)
        reportApiError(apiError)
        throw apiError
      }
    },
    async submitEssay(block, essayText) {
      try {
        const result = await learningApi.submitEssay(lesson.id, block.id, {
          requestId: newRequestId(),
          essayText,
        })
        await reloadSessionPoints()
        return result
      } catch (reason) {
        const apiError = toApiError(reason)
        reportApiError(apiError)
        throw apiError
      }
    },
  }

  async function completeLesson() {
    if (completeInFlight.current) return
    completeInFlight.current = true
    setCompleting(true)
    setError(null)
    try {
      const result = await learningApi.completeLesson(lesson.id)
      if (result.pendingReviews.length > 0 || USE_MOCK_LEARNING) setPendingReviews(result.pendingReviews)
      setCompletion(result)
    } catch (reason) {
      const apiError = toApiError(reason)
      reportApiError(apiError)
      setError(`${apiError.message} Hãy thử lại.`)
      completeInFlight.current = false
    } finally {
      setCompleting(false)
    }
  }

  return (
    <article className="lp-page lp-lesson-page" aria-labelledby="lp-lesson-title">
      <Link className="lp-back" to={`/learn/topics/${lesson.topicId}`}><ArrowLeft aria-hidden="true" size={16} />{lesson.topicTitle}</Link>
      <header className="lp-lesson-head">
        <p className="lp-eyebrow">Bài {lesson.sortOrder}</p>
        <h1 id="lp-lesson-title">{lesson.title}</h1>
      </header>
      <BlockList blocks={lesson.blocks} context={context} />
      {!hasExercise && !done ? (
        <div className="lp-complete-bar">
          <p>Bài này không có bài tập. Đọc xong thì đánh dấu hoàn thành.</p>
          {error ? <p className="lp-error" role="alert">{error}</p> : null}
          <Button className="lp-btn" disabled={completing} onClick={completeLesson} type="button">
            {completing ? <Loader2 aria-hidden="true" className="lp-spin" /> : <CheckCircle2 aria-hidden="true" />}
            Hoàn thành bài
          </Button>
        </div>
      ) : null}
      {done ? <CompletionPanel fresh={completion !== null} lesson={lesson} nextLessonId={completion?.nextLessonId ?? lesson.nextLessonId} /> : null}
    </article>
  )
}

function CompletionPanel({ lesson, nextLessonId, fresh }: { lesson: LessonDetail; nextLessonId: string | null; fresh: boolean }) {
  const pending = usePendingReviews()
  const review = pending[0]
  const topicPath = `/learn/topics/${lesson.topicId}`
  const practicePath = `/learn/lessons/${lesson.id}/practice`

  return (
    <section className={`lp-done${review ? ' lp-done--review' : ''}`} role="status" aria-labelledby="lp-done-title">
      <span className="lp-done__icon" aria-hidden="true">{review ? <ShieldAlert size={24} /> : <CheckCircle2 size={24} />}</span>
      <div className="lp-done__body">
        <h2 id="lp-done-title">{fresh ? 'Bạn đã hoàn thành bài này' : 'Bài này đã hoàn thành'}</h2>
        {review ? (
          <p>Trước khi sang bài kế, cần ôn lại "{review.knowledgePointTitle}". Bài ôn gồm phần lý thuyết và một bộ câu hỏi ngắn.</p>
        ) : (
          <p>
            Tiếp theo: làm <strong>luyện thêm (practice)</strong> nếu còn REQUIRED — đề cuối chỉ mở khi mọi bài đã practice PASSED và không còn review.
            {nextLessonId ? ' Bạn cũng có thể sang bài học kế tiếp.' : ''}
          </p>
        )}
      </div>
      <div className="lp-done__actions">
        {review ? (
          <Button asChild className="lp-btn lp-btn--accent lp-btn--cta"><Link to={`/learn/reviews/${review.reviewId}`}>Làm bài ôn<ArrowRight aria-hidden="true" /></Link></Button>
        ) : (
          <Button asChild className="lp-btn lp-btn--accent lp-btn--cta"><Link to={practicePath}>Luyện thêm<ArrowRight aria-hidden="true" /></Link></Button>
        )}
        {nextLessonId ? (
          <Button asChild className="lp-btn"><Link to={`/learn/lessons/${nextLessonId}`}>Bài tiếp theo</Link></Button>
        ) : (
          <Button asChild className="lp-btn"><Link to={topicPath}><Flag aria-hidden="true" />Về topic / đề cuối</Link></Button>
        )}
        <Button asChild className="lp-btn" variant="outline"><Link to={topicPath}>Về topic</Link></Button>
      </div>
    </section>
  )
}
