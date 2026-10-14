import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  CircleDot,
  Dumbbell,
  Flag,
  FolderOpen,
  Loader2,
  MonitorPlay,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LessonCompletionResult, LessonDetail, ReviewRef } from '~types/learningPath'
import type { LessonResourcesResponse, LessonTab } from '~types/lesson'
import { learningApi, toApiError } from '../api'
import { USE_MOCK_LEARNING } from '@/lib/env'
import { LessonPractice } from '../components/LessonPractice'
import { LearnTrail } from '../components/LearnTrail'
import { courseTopicPath, topicPagePath } from '../lib/routes'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { LessonDocuments } from '../components/resources/LessonDocuments'
import { LessonSlides } from '../components/resources/LessonSlides'
import { LessonSummary } from '../components/resources/LessonSummary'
import { reportApiError, setPendingReviews, usePendingReviews } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'
import { useSyncPendingReviews } from '../lib/useSyncPendingReviews'

interface TabEntry {
  tab: LessonTab
  label: string
  icon: LucideIcon
  /** How many items the tab holds, or null when that is not a count. */
  count: (resources: LessonResourcesResponse) => number | null
}

const TABS: readonly TabEntry[] = [
  { tab: 'slides', label: 'Slide bài giảng', icon: MonitorPlay, count: (r) => r.slides.length },
  { tab: 'summary', label: 'Lesson Summary', icon: BookOpenText, count: (r) => (r.summaryMarkdown?.trim() ? 1 : 0) },
  { tab: 'documents', label: 'Tài liệu bài khoá', icon: FolderOpen, count: (r) => r.documents.length },
  { tab: 'practice', label: 'Luyện tập', icon: Dumbbell, count: () => null },
]

function parseTab(value: string | null): LessonTab {
  return value === 'summary' || value === 'documents' || value === 'practice' ? value : 'slides'
}

export function LessonPage() {
  const { lessonId = '' } = useParams()
  const resource = useApiResource(`lesson:${lessonId}`, () => learningApi.getLesson(lessonId))
  useSyncPendingReviews(resource.status === 'success' ? resource.data?.pendingReviews : undefined)

  if (resource.status === 'loading') return <LoadingState label="Đang tải bài học…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  return <LessonView key={resource.data.id} lesson={resource.data} />
}

type LessonState = 'review' | 'practice' | 'done' | 'reading'

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
    default:
      return {
        label: 'Đang học',
        hint: 'Xem slide, tóm tắt và tài liệu rồi bấm hoàn thành để ghi nhận tiến độ.',
        tone: 'active',
        icon: CircleDot,
      }
  }
}

export function LessonView({ lesson }: { lesson: LessonDetail }) {
  const [searchParams] = useSearchParams()
  const tab = parseTab(searchParams.get('view'))
  const [completion, setCompletion] = useState<LessonCompletionResult | null>(null)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const completeInFlight = useRef(false)
  const pendingReviews = usePendingReviews()
  const activeReview = pendingReviews[0]

  const resources = useApiResource(`lesson-resources:${lesson.id}`, () => learningApi.getLessonResources(lesson.id))
  const siblings = useApiResource(`topic:${lesson.topicId}`, () => learningApi.getTopicLessons(lesson.topicId))
  const reloadSiblings = siblings.reload
  useEffect(() => {
    if (completion) reloadSiblings()
  }, [completion, reloadSiblings])
  const ordered = [...(siblings.data?.lessons ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const self = ordered.find((item) => item.id === lesson.id)

  const done = completion !== null || lesson.status === 'COMPLETED'
  const nextLessonId = completion?.nextLessonId
    ?? lesson.nextLessonId
    ?? ordered.find((item) => item.sortOrder > lesson.sortOrder)?.id
    ?? null
  const needsPractice = (self?.practiceStatus ?? (lesson as unknown as { practiceStatus?: string }).practiceStatus) === 'REQUIRED'
  const hasNext = nextLessonId ? true : siblings.status === 'loading' ? null : false
  const topicPath = topicPagePath(lesson.topicId)
  const lessonPath = `/learn/lessons/${lesson.id}`
  const practicePath = `${lessonPath}?view=practice`

  const state: LessonState = activeReview ? 'review' : done ? (needsPractice ? 'practice' : 'done') : 'reading'
  const copy = stateCopy(state, activeReview, hasNext)
  const StateIcon = copy.icon

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

  const action = (
    <PrimaryAction
      completing={completing}
      nextLessonId={nextLessonId}
      onComplete={completeLesson}
      practicePath={practicePath}
      reviewId={activeReview?.reviewId}
      state={state}
      topicPath={topicPath}
    />
  )

  function panel() {
    if (tab === 'practice') return <LessonPractice key={`${lesson.id}:${done}`} lessonId={lesson.id} />
    if (resources.status === 'loading') return <LoadingState label="Đang tải…" />
    if (resources.status === 'error' && resources.error) {
      return <ApiErrorState error={resources.error} onRetry={resources.reload} />
    }
    if (!resources.data) return null
    if (tab === 'summary') return <LessonSummary markdown={resources.data.summaryMarkdown} topicTitle={lesson.topicTitle} />
    if (tab === 'documents') return <LessonDocuments documents={resources.data.documents} />
    return <LessonSlides slides={resources.data.slides} />
  }

  const current = TABS.find((entry) => entry.tab === tab) ?? TABS[0]!

  return (
    <article className="lp-page lp-lesson-page lp-res-page" aria-labelledby="lp-lesson-title">
      <NoticeBanner />

      <div className="lp-res-layout">
        <div className="lp-res-main">
          <LearnTrail
            items={[
              { label: 'Khóa học', to: '/learn' },
              ...(siblings.data?.topic.course
                ? [{ label: siblings.data.topic.course.title, to: courseTopicPath(siblings.data.topic.course.id, lesson.topicId) }]
                : []),
              { label: lesson.topicTitle, to: topicPath },
              { label: `Bài ${lesson.sortOrder} · ${lesson.title}` },
            ]}
          />

          <header className="lp-lesson-head">
            <p className="lp-eyebrow">Bài {lesson.sortOrder} · {lesson.topicTitle}</p>
            <h1 id="lp-lesson-title">{lesson.title}</h1>
          </header>

          <section className="lp-res-card" aria-label={current.label}>
            {tab === 'practice' ? null : <h2>{current.label}</h2>}
            {panel()}
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
          ) : null}
        </div>

        <aside className="lp-res-rail" aria-label="Nội dung và tiến độ bài học">
          <nav className="lp-res-nav" aria-label="Nội dung bài học">
            <p className="lp-res-nav__label">Nội dung bài học</p>
            {TABS.map(({ tab: target, label, icon: Icon, count }) => {
              const total = resources.data ? count(resources.data) : null
              return (
                <Link
                  key={target}
                  className={`lp-res-nav__link${target === tab ? ' is-active' : ''}`}
                  to={target === 'slides' ? lessonPath : `${lessonPath}?view=${target}`}
                  replace
                  aria-current={target === tab ? 'page' : undefined}
                >
                  <Icon aria-hidden="true" size={17} />
                  <span>{label}</span>
                  {total ? <small>{total}</small> : null}
                </Link>
              )
            })}
          </nav>

          <div className="lp-rail-card lp-res-progress">
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
}: {
  state: LessonState
  reviewId?: string
  nextLessonId: string | null
  completing: boolean
  practicePath: string
  topicPath: string
  onComplete: () => void
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
          Luyện tập bài này
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
    ? <>Bạn cần củng cố lại <strong>“{review.knowledgePointTitle}”</strong> trước khi học tiếp. Bài ôn gồm phần tóm tắt lý thuyết và vài câu hỏi ngắn.</>
    : needsPractice
      ? 'Bài này yêu cầu luyện tập trước khi mở bài kiểm tra chặng.'
      : nextLessonId
        ? 'Kiến thức của bài đã được ghi nhận. Bạn có thể luyện tập hoặc sang bài tiếp theo.'
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
          {!warning ? <Link to={practicePath}>Luyện tập bài này</Link> : null}
          <Link to={topicPath}>Về danh sách bài</Link>
        </div>
      </div>
    </section>
  )
}
