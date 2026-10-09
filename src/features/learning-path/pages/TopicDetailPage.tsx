import { useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Clock3, Dumbbell, Flag, Loader2, Lock, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FinalTestSummary, LessonSummary, ReviewRef, TopicLessonsResponse } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { reportApiError, usePendingReviews } from '../lib/reviewGate'
import { lessonStatusMeta } from '../lib/statusMeta'
import { useApiResource } from '../lib/useApiResource'
import { useSyncPendingReviews } from '../lib/useSyncPendingReviews'

const SKILL_LABEL: Record<string, string> = {
  READING: 'Reading',
  LISTENING: 'Listening',
  WRITING: 'Writing',
  SPEAKING: 'Speaking',
}

export function TopicDetailPage() {
  const { topicId = '' } = useParams()
  const resource = useApiResource(`topic:${topicId}`, () => learningApi.getTopicLessons(topicId))
  useSyncPendingReviews(
    resource.status === 'success' ? resource.data?.pendingReviews : undefined,
    { allowClear: true },
  )

  if (resource.status === 'loading') return <LoadingState label="Đang tải chặng học…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  return <TopicDetailView detail={resource.data} onChanged={resource.reload} />
}

function needsPractice(lesson: LessonSummary) {
  return lesson.status === 'COMPLETED' && lesson.practiceStatus === 'REQUIRED'
}

export function TopicDetailView({ detail, onChanged }: { detail: TopicLessonsResponse; onChanged: () => void }) {
  const { topic, lessons, finalTest } = detail
  const progress = topic.totalLessons === 0 ? 0 : Math.round((topic.completedLessons / topic.totalLessons) * 100)
  const sorted = [...lessons].sort((a, b) => a.sortOrder - b.sortOrder)
  const continueLesson = sorted.find((lesson) => lesson.status === 'AVAILABLE') ?? sorted.find(needsPractice)
  const continueIsPractice = continueLesson ? needsPractice(continueLesson) : false
  const pendingReviews = usePendingReviews()
  const blockingReview = continueLesson && !continueIsPractice ? pendingReviews[0] : undefined
  const neverStarted = !sorted.some((lesson) => lesson.status === 'COMPLETED')
  const totalMinutes = sorted.reduce((sum, lesson) => sum + (lesson.estimatedMinutes || 0), 0)
  const skill = topic.skill ? SKILL_LABEL[topic.skill.toUpperCase()] ?? topic.skill : null
  const coursePath = topic.course ? `/learn/courses/${topic.course.id}` : '/learn'

  return (
    <div className="lp-page lp-topic-page">
      <NoticeBanner />
      <Link className="lp-back" to={coursePath}>
        <ArrowLeft aria-hidden="true" size={16} />
        {topic.course ? topic.course.title : 'Lộ trình khóa học'}
      </Link>

      <header className="lp-overview">
        <div className="lp-overview__text">
          <p className="lp-eyebrow">
            Chặng {String(topic.sequenceOrder).padStart(2, '0')}
            {skill ? ` · ${skill}` : ''}
          </p>
          <h1>{topic.title}</h1>
          {topic.description ? <p className="lp-overview__lead">{topic.description}</p> : null}
        </div>

        <div className="lp-overview__panel">
          <div className="lp-meter">
            <div className="lp-meter__row">
              <span><strong>{topic.completedLessons}/{topic.totalLessons}</strong> bài đã xong</span>
              <span className="lp-meter__value">{progress}%</span>
            </div>
            <progress className="lp-progress" max={100} value={progress}>{progress}%</progress>
          </div>

          {blockingReview ? (
            <>
              <p className="lp-overview__next">
                <span>Cần làm trước</span>
                Bài ôn: {blockingReview.knowledgePointTitle}
              </p>
              <Button asChild className="lp-btn lp-btn--accent lp-btn--cta lp-overview__cta">
                <Link to={`/learn/reviews/${blockingReview.reviewId}`}>
                  Làm bài ôn
                  <ArrowRight aria-hidden="true" size={18} />
                </Link>
              </Button>
            </>
          ) : continueLesson ? (
            <>
              <p className="lp-overview__next">
                <span>{continueIsPractice ? 'Cần luyện thêm' : neverStarted ? 'Bắt đầu với' : 'Tiếp theo'}</span>
                Bài {continueLesson.sortOrder}: {continueLesson.title}
              </p>
              <Button asChild className="lp-btn lp-btn--accent lp-btn--cta lp-overview__cta">
                <Link to={continueIsPractice ? `/learn/lessons/${continueLesson.id}/practice` : `/learn/lessons/${continueLesson.id}`}>
                  {continueIsPractice ? 'Luyện thêm' : neverStarted ? 'Bắt đầu học' : 'Học tiếp'}
                  <ArrowRight aria-hidden="true" size={18} />
                </Link>
              </Button>
            </>
          ) : finalTest.testStatus === 'AVAILABLE' ? (
            <a className="lp-overview__jump" href="#lp-final-title">
              Đã học xong các bài. Làm bài kiểm tra chặng
              <ArrowDown aria-hidden="true" size={16} />
            </a>
          ) : finalTest.testStatus === 'PASSED' ? (
            <p className="lp-overview__done">
              <CheckCircle2 aria-hidden="true" size={18} />
              Bạn đã qua chặng này{finalTest.lastPercent !== null ? ` · ${finalTest.lastPercent}%` : ''}
            </p>
          ) : null}
        </div>
      </header>

      <section className="lp-section" aria-labelledby="lp-lessons-title">
        <div className="lp-section__head">
          <h2 id="lp-lessons-title">Bài học trong chặng</h2>
          <span className="lp-section__note">
            {sorted.length} bài{totalMinutes > 0 ? ` · khoảng ${totalMinutes} phút` : ''}
          </span>
        </div>

        {sorted.length === 0 ? <p className="lp-empty">Chặng này chưa có bài học.</p> : null}
        <ol className="lp-route lp-route--lessons" aria-label="Danh sách bài học">
          {sorted.map((lesson, index) => (
            <LessonStep
              index={index}
              isNext={continueLesson?.id === lesson.id}
              key={lesson.id}
              lesson={lesson}
            />
          ))}
          <FinalTestStop lessons={sorted} onChanged={onChanged} test={finalTest} topicId={topic.id} />
        </ol>
      </section>
    </div>
  )
}

function LessonStep({ lesson, isNext, index }: { lesson: LessonSummary; isNext: boolean; index: number }) {
  const locked = lesson.status === 'LOCKED'
  const completed = lesson.status === 'COMPLETED'
  const practice = needsPractice(lesson)
  const reasonId = `${lesson.id}-reason`
  const action = isNext && !practice ? 'Học tiếp' : completed ? 'Xem lại' : 'Mở bài'

  const body = (
    <>
      <span className="lp-step__main">
        <span className="lp-step__title">{lesson.title}</span>
        <span className="lp-step__meta">
          <span className="lp-step__time">
            <Clock3 aria-hidden="true" size={13} />
            {lesson.estimatedMinutes} phút
          </span>
          {locked && lesson.lockedReason ? (
            <span className="lp-step__reason" id={reasonId}>
              <Lock aria-hidden="true" size={12} />
              {lesson.lockedReason}
            </span>
          ) : null}
        </span>
      </span>
      {!locked ? (
        <span className="lp-step__go">
          {action}
          <ArrowRight aria-hidden="true" size={15} />
        </span>
      ) : null}
      <span className="lp-sr-only">Bài {lesson.sortOrder}, {lessonStatusMeta(lesson.status).label}</span>
    </>
  )

  return (
    <li
      className={`lp-step lp-step--${lesson.status.toLowerCase()}${isNext ? ' is-next' : ''}${practice ? ' needs-practice' : ''}`}
      style={{ '--i': index } as CSSProperties}
    >
      <span className="lp-step__node" aria-hidden="true">
        {completed ? <Check size={16} strokeWidth={2.75} /> : lesson.sortOrder}
      </span>
      <div className="lp-step__body">
        {locked ? (
          <div className="lp-step__row" aria-describedby={lesson.lockedReason ? reasonId : undefined} aria-disabled="true">
            {body}
          </div>
        ) : (
          <Link aria-current={isNext ? 'step' : undefined} className="lp-step__row" to={`/learn/lessons/${lesson.id}`}>
            {body}
          </Link>
        )}
        {practice ? (
          <Link className="lp-step__practice" to={`/learn/lessons/${lesson.id}/practice`}>
            <Dumbbell aria-hidden="true" size={15} />
            <span>Cần luyện thêm trước khi mở bài kiểm tra chặng</span>
            <strong>
              Luyện ngay
              <ArrowRight aria-hidden="true" size={14} />
            </strong>
          </Link>
        ) : null}
      </div>
    </li>
  )
}

type UnlockItem = { key: string; text: string; done: boolean; to?: string }

function unlockChecklist(lessons: LessonSummary[], reviews: ReviewRef[]): UnlockItem[] {
  const incomplete = lessons.filter((lesson) => lesson.status !== 'COMPLETED')
  const practice = lessons.filter(needsPractice)
  const items: UnlockItem[] = [
    {
      key: 'lessons',
      text: incomplete.length > 0
        ? `Hoàn thành ${incomplete.length} bài học còn lại`
        : 'Hoàn thành tất cả bài học',
      done: incomplete.length === 0,
      to: incomplete[0] ? `/learn/lessons/${incomplete[0].id}` : undefined,
    },
    ...(practice.length > 0
      ? [{
          key: 'practice',
          text: `Hoàn thành phần luyện thêm của ${practice.length} bài`,
          done: false,
          to: `/learn/lessons/${practice[0].id}/practice`,
        }]
      : []),
    ...(reviews.length > 0
      ? [{
          key: 'review',
          text: `Làm ${reviews.length} bài ôn bắt buộc`,
          done: false,
          to: `/learn/reviews/${reviews[0].reviewId}`,
        }]
      : []),
  ]
  if (items.every((item) => item.done)) {
    items.push({ key: 'pending', text: 'Hoàn tất phần luyện thêm và bài ôn còn treo (nếu có)', done: false })
  }
  return items
}

function FinalTestStop({
  test,
  topicId,
  lessons,
  onChanged,
}: {
  test: FinalTestSummary
  topicId: string
  lessons: LessonSummary[]
  onChanged: () => void
}) {
  const navigate = useNavigate()
  const pendingReviews = usePendingReviews()
  const [starting, setStarting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const inFlight = useRef(false)
  const status = test.testStatus
  const checklist = status === 'LOCKED' ? unlockChecklist(lessons, pendingReviews) : null

  async function startTest() {
    if (inFlight.current) return
    inFlight.current = true
    setStarting(true)
    setMessage(null)
    try {
      const assignment = await learningApi.createTestAssignment(topicId)
      const attempt = await learningApi.createAttempt({
        packageVersionId: assignment.packageVersionId, attemptType: 'TOPIC_TEST', mode: 'STANDARD', channel: 'WEB', expiresAt: null,
      })
      navigate(`/learn/tests/${attempt.id}?topic=${topicId}`)
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      if (error.code === 'TEST_UNAVAILABLE') {
        setMessage('Chưa có đề cho chặng này. Hãy quay lại sau.')
      } else if (error.code === 'PRACTICE_REQUIRED') {
        const ids = new Set(error.details.lessonIds ?? [])
        const titled = lessons.filter((lesson) => ids.has(lesson.id))
        const names = titled.length > 0
          ? titled.map((lesson) => `Bài ${lesson.sortOrder}`).join(', ')
          : `${ids.size || 'một số'} bài`
        setMessage(`Cần luyện thêm trước khi mở đề: ${names}. Mở bài học tương ứng và hoàn thành phần luyện thêm.`)
        onChanged()
      } else if (error.code === 'REVIEW_REQUIRED') {
        const first = error.details.reviews?.[0] ?? pendingReviews[0]
        setMessage(first
          ? `Cần làm bài ôn “${first.knowledgePointTitle}” trước khi làm bài kiểm tra.`
          : 'Cần làm bài ôn trước khi làm bài kiểm tra.')
        onChanged()
      } else if (error.code === 'TEST_LOCKED') {
        setMessage('Bài kiểm tra chưa mở. Hoàn thành bài học, luyện thêm và bài ôn (nếu có).')
        onChanged()
      } else {
        setMessage(`${error.message} Hãy thử lại.`)
      }
      inFlight.current = false
      setStarting(false)
    }
  }

  const meta = [
    test.questionCount > 0 ? `${test.questionCount} câu hỏi` : null,
    'cần đạt từ 70%',
    'không giới hạn thời gian',
    test.lastPercent !== null ? `lần gần nhất ${test.lastPercent}%` : null,
  ].filter(Boolean).join(' · ')

  return (
    <li className={`lp-stop lp-stop--finish lp-finish--${status.toLowerCase()}`}>
      <span className="lp-stop__node" aria-hidden="true">
        {status === 'PASSED' ? <Trophy size={17} /> : <Flag size={16} />}
      </span>
      <section className="lp-finish" aria-labelledby="lp-final-title">
        <div className="lp-finish__head">
          <div className="lp-finish__text">
            <p className="lp-stop__kicker">Kiểm tra cuối chặng</p>
            <h3 id="lp-final-title" className="lp-stop__title">{test.title}</h3>
            {status === 'NONE'
              ? <p className="lp-finish__meta">Chặng này không có bài kiểm tra cuối.</p>
              : <p className="lp-finish__meta">{meta}</p>}
          </div>
          {status === 'AVAILABLE' ? (
            <Button className="lp-btn lp-btn--accent lp-btn--cta" disabled={starting} onClick={startTest} type="button">
              {starting ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
              {starting ? 'Đang giao đề…' : 'Làm bài kiểm tra'}
            </Button>
          ) : status === 'PASSED' ? (
            <span className="lp-chip lp-chip--success">Đã đạt</span>
          ) : null}
        </div>

        {checklist ? (
          <div className="lp-finish__unlock" role="status">
            <p>Để mở bài kiểm tra:</p>
            <ul className="lp-checklist">
              {checklist.map((item) => (
                <li className={item.done ? 'is-done' : undefined} key={item.key}>
                  {item.done
                    ? <CheckCircle2 aria-hidden="true" size={16} />
                    : <Circle aria-hidden="true" size={16} />}
                  {item.to && !item.done ? <Link to={item.to}>{item.text}</Link> : <span>{item.text}</span>}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {message ? <p className="lp-error" role="alert">{message}</p> : null}
      </section>
    </li>
  )
}
