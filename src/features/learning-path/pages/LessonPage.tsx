import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { LearnTrail, type TrailItem } from '../components/LearnTrail'
import { LessonPractice } from '../components/LessonPractice'
import { courseTopicPath, topicPagePath } from '../lib/routes'
import { hasRequiredPractice, lessonPath, lessonPracticePath } from '../lib/lessonPractice'
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
      return { label: 'Cần đạt phần Luyện tập', hint: 'Đạt phần Luyện tập để hoàn thành bài và mở bài tiếp theo.', tone: 'warning', icon: ShieldAlert }
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
  const navigate = useNavigate()
  const tab = parseTab(searchParams.get('view'))
  const [completion, setCompletion] = useState<LessonCompletionResult | null>(null)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const completeInFlight = useRef(false)
  // The Practice set being worked on, shown in the trail; stepping back to the list remounts the Practice.
  const [openSet, setOpenSet] = useState<{ code: string; title: string } | null>(null)
  const [practiceKey, setPracticeKey] = useState(0)
  const pendingReviews = usePendingReviews()
  const activeReview = pendingReviews[0]

  const resources = useApiResource(`lesson-resources:${lesson.id}`, () => learningApi.getLessonResources(lesson.id))
  const siblings = useApiResource(`topic:${lesson.topicId}`, () => learningApi.getTopicLessons(lesson.topicId))
  // Only the counts of the Practice sets and pending reviews of this lesson, for the side navigation.
  const practiceSets = useApiResource(`lesson-practice-count:${lesson.id}`, () => learningApi.getLessonPracticeSets(lesson.id))
  const lessonReviews = useApiResource(`lesson-reviews:${lesson.id}`, async () =>
    (await learningApi.getPendingReviews()).filter((review) => review.lessonId === lesson.id))
  const reloadSiblings = siblings.reload
  useEffect(() => {
    if (completion) reloadSiblings()
  }, [completion, reloadSiblings])
  const ordered = [...(siblings.data?.lessons ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const self = ordered.find((item) => item.id === lesson.id)

  const done = completion !== null || lesson.status === 'COMPLETED' || self?.status === 'COMPLETED'
  const nextLessonId = completion?.nextLessonId
    ?? lesson.nextLessonId
    ?? ordered.find((item) => item.sortOrder > lesson.sortOrder)?.id
    ?? null
  const requiresPractice = self ? hasRequiredPractice(self) : null
  const hasNext = nextLessonId ? true : siblings.status === 'loading' ? null : false
  const topicPath = topicPagePath(lesson.topicId)
  const path = lessonPath(lesson.id)
  const practicePath = lessonPracticePath(lesson.id)

  const hasReview = Boolean(lessonReviews.data?.length)
  const state: LessonState = activeReview ? 'review' : done ? 'done' : requiresPractice ? 'practice' : 'reading'
  const copy = stateCopy(state, activeReview, hasNext)
  // A lesson waiting for its Practice has no status card: the Practice entry of the side navigation is the way in.
  const showProgress = state !== 'practice'
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
      if (apiError.code === 'PRACTICE_REQUIRED') {
        navigate(practicePath)
        return
      }
      reportApiError(apiError)
      setError(`${apiError.message} Hãy thử lại.`)
      completeInFlight.current = false
    } finally {
      setCompleting(false)
    }
  }

  const action = requiresPractice === null && !done && !activeReview ? null : (
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

  // The Practice reports back here, so the side navigation and the lesson's state follow what the learner just did.
  function practiceChanged() {
    practiceSets.reload()
    lessonReviews.reload()
    reloadSiblings()
  }

  function panel() {
    if (tab === 'practice') {
      return <LessonPractice key={`${lesson.id}:${practiceKey}`} lessonId={lesson.id} onChanged={practiceChanged} onSetChange={setOpenSet} />
    }
    if (resources.status === 'loading') return <LoadingState label="Đang tải…" />
    if (resources.status === 'error' && resources.error) {
      return <ApiErrorState error={resources.error} onRetry={resources.reload} />
    }
    if (!resources.data) return null
    if (tab === 'summary') return <LessonSummary markdown={resources.data.summaryMarkdown} topicTitle={lesson.topicTitle} />
    if (tab === 'documents') return <LessonDocuments documents={resources.data.documents} />
    return <LessonSlides slides={resources.data.slides} />
  }

  const current = TABS.find((entry) => entry.tab === tab) ?? { label: 'Luyện tập' }
  const lessonCrumb = `Bài ${lesson.sortOrder} · ${lesson.title}`
  const trailTail: TrailItem[] = tab !== 'practice' ? [{ label: lessonCrumb }]
    : openSet
      ? [{ label: lessonCrumb, to: path }, { label: 'Luyện tập', to: practicePath, onClick: () => setPracticeKey((key) => key + 1) }, { label: openSet.code }]
      : [{ label: lessonCrumb, to: path }, { label: 'Luyện tập' }]

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
              ...trailTail,
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
              requiresPractice={requiresPractice}
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
                  to={target === 'slides' ? path : `${path}?view=${target}`}
                  replace
                  aria-current={target === tab ? 'page' : undefined}
                >
                  <Icon aria-hidden="true" size={17} />
                  <span>{label}</span>
                  {total ? <small>{total}</small> : null}
                </Link>
              )
            })}
            {requiresPractice || tab === 'practice' ? (
              <Link
                className={`lp-res-nav__link${tab === 'practice' ? ' is-active' : ''}${hasReview ? ' has-review' : ''}`}
                to={practicePath}
                replace
                aria-current={tab === 'practice' ? 'page' : undefined}
              >
                <Dumbbell aria-hidden="true" size={17} />
                <span className="lp-res-nav__text">
                  Luyện tập
                  {hasReview ? (
                    <em className="lp-res-nav__warn">Có bài ôn cần làm</em>
                  ) : null}
                </span>
                {practiceSets.data?.items.length ? <small>{practiceSets.data.items.length}</small> : null}
              </Link>
            ) : null}
          </nav>

          {showProgress ? (
            <div className="lp-rail-card lp-res-progress">
              <p className="lp-rail-card__kicker">Bài {lesson.sortOrder} · {lesson.topicTitle}</p>
              <p className={`lp-rail-status lp-rail-status--${copy.tone}`}>
                <StateIcon aria-hidden="true" size={18} />
                {copy.label}
              </p>
              <p className="lp-rail-card__hint">{copy.hint}</p>
              {action}
              {error ? <p className="lp-error" role="alert">{error}</p> : null}
            </div>
          ) : null}
        </aside>
      </div>

      {showProgress ? (
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
      ) : null}
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
  requiresPractice,
  nextLessonId,
  practicePath,
  topicPath,
}: {
  fresh: boolean
  review?: ReviewRef
  requiresPractice: boolean | null
  nextLessonId: string | null
  practicePath: string
  topicPath: string
}) {
  const warning = Boolean(review)
  const message = review
    ? <>Bạn cần củng cố lại <strong>“{review.knowledgePointTitle}”</strong> trước khi học tiếp. Bài ôn gồm phần tóm tắt lý thuyết và vài câu hỏi ngắn.</>
    : nextLessonId
      ? 'Bạn đã đạt bài này. Có thể luyện thêm hoặc sang bài tiếp theo.'
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
          {!warning && requiresPractice ? <Link to={practicePath}>Luyện tập bài này</Link> : null}
          <Link to={topicPath}>Về danh sách bài</Link>
        </div>
      </div>
    </section>
  )
}
