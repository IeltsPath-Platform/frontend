import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowRight, CheckCircle2, CircleDot, Flag, Loader2, ShieldAlert, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { reloadSessionPoints, useAuthSession } from '@/features/auth/authSession'
import type { LessonCompletionResult, LessonDetail, ReviewRef } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { USE_MOCK_LEARNING } from '@/lib/env'
import { NoticeBanner } from '../components/NoticeBanner'
import { BlockList } from '../components/blocks/BlockList'
import type { BlockRenderContext } from '../components/blocks/blockRegistry'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { isEssayBlock, isExerciseBlock } from '../lib/blockGuards'
import { newRequestId } from '../lib/requestId'
import { reportApiError, setPendingReviews, usePendingReviews } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'
import { useSyncPendingReviews } from '../lib/useSyncPendingReviews'

export function LessonPage() {
  const { lessonId = '' } = useParams()
  const resource = useApiResource(`lesson:${lessonId}`, () => learningApi.getLesson(lessonId))
  useSyncPendingReviews(resource.status === 'success' ? resource.data?.pendingReviews : undefined)

  if (resource.status === 'loading') return <LoadingState label="Đang tải nội dung bài học…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  return <LessonView key={resource.data.id} lesson={resource.data} />
}

type LessonState = 'review' | 'practice' | 'done' | 'exercise' | 'reading'

interface StateCopy {
  label: string
  hint: string
  tone: 'active' | 'success' | 'warning'
  icon: LucideIcon
}

function stateCopy(state: LessonState, review: ReviewRef | undefined, hasNext: boolean | null): StateCopy {
  switch (state) {
    case 'review':
      return {
        label: 'Cần làm bài ôn',
        hint: `Hoàn thành bài ôn “${review?.knowledgePointTitle ?? ''}” để học tiếp.`,
        tone: 'warning',
        icon: ShieldAlert,
      }
    case 'practice':
      return { label: 'Cần luyện thêm', hint: 'Luyện thêm bài này để mở bài kiểm tra chặng.', tone: 'warning', icon: ShieldAlert }
    case 'done':
      return {
        label: 'Đã hoàn thành',
        hint: hasNext === null
          ? 'Bạn đã hoàn thành bài này.'
          : hasNext ? 'Sẵn sàng sang bài tiếp theo.' : 'Đây là bài cuối của chặng. Tiếp theo là bài kiểm tra chặng.',
        tone: 'success',
        icon: CheckCircle2,
      }
    case 'exercise':
      return { label: 'Đang học', hint: 'Làm và nộp bài tập trong bài để hoàn thành.', tone: 'active', icon: CircleDot }
    default:
      return { label: 'Đang học', hint: 'Đọc hết nội dung rồi bấm hoàn thành để ghi nhận tiến độ.', tone: 'active', icon: CircleDot }
  }
}

function LessonView({ lesson }: { lesson: LessonDetail }) {
  const { points } = useAuthSession()
  const [completion, setCompletion] = useState<LessonCompletionResult | null>(null)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const completeInFlight = useRef(false)
  const pendingReviews = usePendingReviews()
  const activeReview = pendingReviews[0]

  const siblings = useApiResource(`topic:${lesson.topicId}`, () => learningApi.getTopicLessons(lesson.topicId))
  const reloadSiblings = siblings.reload
  useEffect(() => {
    if (completion) reloadSiblings()
  }, [completion, reloadSiblings])
  const ordered = [...(siblings.data?.lessons ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const self = ordered.find((item) => item.id === lesson.id)

  const hasInteractive = lesson.blocks.some((b) => isExerciseBlock(b) || isEssayBlock(b))
  const done = completion !== null || lesson.status === 'COMPLETED'
  const nextLessonId = completion?.nextLessonId
    ?? lesson.nextLessonId
    ?? ordered.find((item) => item.sortOrder > lesson.sortOrder)?.id
    ?? null
  const needsPractice = (self?.practiceStatus ?? (lesson as unknown as { practiceStatus?: string }).practiceStatus) === 'REQUIRED'
  const hasNext = nextLessonId ? true : siblings.status === 'loading' ? null : false
  const topicPath = `/learn/topics/${lesson.topicId}`
  const practicePath = `/learn/lessons/${lesson.id}/practice`

  const state: LessonState = activeReview
    ? 'review'
    : done
      ? needsPractice ? 'practice' : 'done'
      : hasInteractive ? 'exercise' : 'reading'
  const copy = stateCopy(state, activeReview, hasNext)
  const StateIcon = copy.icon

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

  function scrollToInteractive() {
    const el = document.querySelector('.lp-exercise') ?? document.querySelector('.lp-essay')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const action = (
    <PrimaryAction
      completing={completing}
      nextLessonId={nextLessonId}
      onComplete={completeLesson}
      onScrollInteractive={scrollToInteractive}
      practicePath={practicePath}
      reviewId={activeReview?.reviewId}
      state={state}
      topicPath={topicPath}
    />
  )

  return (
    <article className="lp-page lp-lesson-page" aria-labelledby="lp-lesson-title">
      <NoticeBanner />

      <div className="lp-lesson-layout">
        <div className="lp-lesson-main">
          <Link className="lp-back" to={topicPath}>
            <ArrowLeft aria-hidden="true" size={16} />
            {lesson.topicTitle}
          </Link>

          <header className="lp-lesson-head">
            <p className="lp-eyebrow">
              Bài {lesson.sortOrder} · {hasInteractive ? 'Lý thuyết và bài tập' : 'Lý thuyết'}
            </p>
            <h1 id="lp-lesson-title">{lesson.title}</h1>
          </header>

          <section className="lp-lesson-content" aria-label="Nội dung bài học">
            <BlockList blocks={lesson.blocks} context={context} />
          </section>

          {done ? (
            <CompletionPanel
              fresh={completion !== null}
              needsPractice={needsPractice}
              nextLessonId={nextLessonId}
              practicePath={practicePath}
              review={activeReview}
              topicPath={topicPath}
            />
          ) : !hasInteractive ? (
            <p className="lp-lesson-end">
              Hết nội dung bài học. Bấm <strong>Hoàn thành bài</strong> để ghi nhận tiến độ.
            </p>
          ) : null}
        </div>

        <aside className="lp-lesson-rail" aria-label="Tiến độ bài học">
          <div className="lp-rail-card">
            <p className="lp-rail-card__kicker">Bài {lesson.sortOrder} · {lesson.topicTitle}</p>
            <p className={`lp-rail-status lp-rail-status--${copy.tone}`}>
              <StateIcon aria-hidden="true" size={18} />
              {copy.label}
            </p>
            <p className="lp-rail-card__hint">{copy.hint}</p>
            {action}
            {error ? <p className="lp-error" role="alert">{error}</p> : null}
            <Link className="lp-rail-card__link" to={topicPath}>Danh sách bài của chặng</Link>
          </div>
        </aside>
      </div>

      <div className="lp-lesson-mobile-bar">
        {error ? <p className="lp-error" role="alert">{error}</p> : null}
        <div className="lp-lesson-mobile-bar__inner">
          <p className={`lp-rail-status lp-rail-status--${copy.tone}`}>
            <StateIcon aria-hidden="true" size={16} />
            {copy.label}
          </p>
          {action}
        </div>
      </div>
    </article>
  )
}

function PrimaryAction({
  state,
  reviewId,
  nextLessonId,
  completing,
  practicePath,
  topicPath,
  onComplete,
  onScrollInteractive,
}: {
  state: LessonState
  reviewId?: string
  nextLessonId: string | null
  completing: boolean
  practicePath: string
  topicPath: string
  onComplete: () => void
  onScrollInteractive: () => void
}) {
  if (state === 'review' && reviewId) {
    return (
      <Button asChild className="lp-btn lp-btn--accent lp-btn--cta lp-btn--block">
        <Link to={`/learn/reviews/${reviewId}`}>
          Làm bài ôn
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </Button>
    )
  }

  if (state === 'practice') {
    return (
      <Button asChild className="lp-btn lp-btn--accent lp-btn--cta lp-btn--block">
        <Link to={practicePath}>
          Luyện thêm bài này
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </Button>
    )
  }

  if (state === 'done') {
    return (
      <Button asChild className="lp-btn lp-btn--accent lp-btn--cta lp-btn--block">
        {nextLessonId ? (
          <Link to={`/learn/lessons/${nextLessonId}`}>
            Bài tiếp theo
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        ) : (
          <Link to={topicPath}>
            <Flag aria-hidden="true" size={16} />
            Về chặng làm bài kiểm tra
          </Link>
        )}
      </Button>
    )
  }

  if (state === 'reading') {
    return (
      <Button
        className="lp-btn lp-btn--accent lp-btn--cta lp-btn--block"
        disabled={completing}
        onClick={onComplete}
        type="button"
      >
        {completing ? <Loader2 aria-hidden="true" className="lp-spin" /> : <CheckCircle2 aria-hidden="true" size={16} />}
        {completing ? 'Đang ghi nhận…' : 'Hoàn thành bài'}
      </Button>
    )
  }

  return (
    <Button className="lp-btn lp-btn--quiet lp-btn--block" onClick={onScrollInteractive} type="button" variant="outline">
      Đến phần bài tập
      <ArrowDown aria-hidden="true" size={16} />
    </Button>
  )
}

function CompletionPanel({
  fresh,
  review,
  needsPractice,
  nextLessonId,
  practicePath,
  topicPath,
}: {
  fresh: boolean
  review?: ReviewRef
  needsPractice: boolean
  nextLessonId: string | null
  practicePath: string
  topicPath: string
}) {
  const warning = Boolean(review) || needsPractice
  const message = review
    ? <>Bạn cần củng cố lại <strong>“{review.knowledgePointTitle}”</strong> trước khi học tiếp. Bài ôn gồm tóm tắt lý thuyết và vài câu hỏi ngắn.</>
    : needsPractice
      ? 'Bài này yêu cầu luyện thêm trước khi mở bài kiểm tra chặng.'
      : nextLessonId
        ? 'Kiến thức của bài đã được ghi nhận. Bạn có thể sang bài tiếp theo.'
        : 'Bạn đã học xong bài cuối của chặng. Quay về chặng để làm bài kiểm tra.'

  return (
    <section className={`lp-done${warning ? ' lp-done--review' : ''}`} role="status" aria-labelledby="lp-done-title">
      <span className="lp-done__icon" aria-hidden="true">
        {warning ? <ShieldAlert size={22} /> : <CheckCircle2 size={22} />}
      </span>
      <div className="lp-done__body">
        <h2 id="lp-done-title">{fresh ? 'Bạn đã hoàn thành bài này' : 'Bài này đã hoàn thành'}</h2>
        <p>{message}</p>
        <div className="lp-done__links">
          {!warning && nextLessonId ? <Link to={practicePath}>Luyện thêm bài này</Link> : null}
          <Link to={topicPath}>Về danh sách bài</Link>
        </div>
      </div>
    </section>
  )
}
