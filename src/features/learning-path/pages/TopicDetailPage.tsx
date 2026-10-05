import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock3, Flag, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FinalTestSummary, LessonSummary, ReviewRef, TopicLessonsResponse } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import { reportApiError, usePendingReviews } from '../lib/reviewGate'
import { lessonStatusMeta, testStatusMeta, topicStatusMeta } from '../lib/statusMeta'
import { useApiResource } from '../lib/useApiResource'
import { useSyncPendingReviews } from '../lib/useSyncPendingReviews'

export function TopicDetailPage() {
  const { topicId = '' } = useParams()
  const resource = useApiResource(`topic:${topicId}`, () => learningApi.getTopicLessons(topicId))
  useSyncPendingReviews(
    resource.status === 'success' ? resource.data?.pendingReviews : undefined,
    { allowClear: true },
  )

  if (resource.status === 'loading') return <LoadingState label="Đang tải topic…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  return <TopicDetailView detail={resource.data} onChanged={resource.reload} />
}

export function TopicDetailView({ detail, onChanged }: { detail: TopicLessonsResponse; onChanged: () => void }) {
  const { topic, lessons, finalTest } = detail
  const progress = topic.totalLessons === 0 ? 0 : Math.round((topic.completedLessons / topic.totalLessons) * 100)

  return (
    <div className="lp-page">
      <NoticeBanner />
      <Link className="lp-back" to="/learn"><ArrowLeft aria-hidden="true" size={16} />Lộ trình</Link>
      <header className="lp-topic-head">
        <div>
          <p className="lp-eyebrow">Chặng {topic.sequenceOrder} · {topic.code}</p>
          <h1>{topic.title}</h1>
          <p>{topic.description}</p>
        </div>
        <div className="lp-topic-head__meter">
          <StatusBadge meta={topicStatusMeta(topic.status)} />
          <label htmlFor="lp-topic-progress">{topic.completedLessons}/{topic.totalLessons} bài đã xong</label>
          <progress className="lp-progress" id="lp-topic-progress" max={100} value={progress}>{progress}%</progress>
        </div>
      </header>
      {lessons.length === 0 ? <p className="lp-empty">Topic này chưa có bài học.</p> : (
        <ol className="lp-lessons" aria-label="Danh sách bài học">
          {[...lessons].sort((a, b) => a.sortOrder - b.sortOrder).map((lesson) => <LessonRow key={lesson.id} lesson={lesson} />)}
        </ol>
      )}
      <FinalTestCard lessons={lessons} onChanged={onChanged} test={finalTest} topicId={topic.id} />
    </div>
  )
}

function LessonRow({ lesson }: { lesson: LessonSummary }) {
  const meta = lessonStatusMeta(lesson.status)
  const openable = lesson.status !== 'LOCKED'
  const reasonId = `${lesson.id}-reason`
  const needsPractice = lesson.status === 'COMPLETED' && lesson.practiceStatus === 'REQUIRED'
  const body = (
    <>
      <span className="lp-lesson__num" aria-hidden="true">{lesson.status === 'LOCKED' ? <Lock size={16} /> : lesson.sortOrder}</span>
      <span className="lp-lesson__main">
        <span className="lp-lesson__title">Bài {lesson.sortOrder}: {lesson.title}</span>
        <span className="lp-lesson__meta"><Clock3 aria-hidden="true" size={14} />{lesson.estimatedMinutes} phút</span>
        {!openable && lesson.lockedReason ? <span className="lp-lesson__reason" id={reasonId}>{lesson.lockedReason}</span> : null}
        {needsPractice ? (
          <span className="lp-lesson__reason" id={`${lesson.id}-practice`}>Cần luyện thêm trước khi mở đề cuối</span>
        ) : null}
      </span>
      <StatusBadge meta={meta} />
    </>
  )
  return (
    <li className={`lp-lesson lp-lesson--${lesson.status.toLowerCase()}`}>
      {openable
        ? <Link className="lp-lesson__row" to={`/learn/lessons/${lesson.id}`}>{body}</Link>
        : <div className="lp-lesson__row" aria-describedby={lesson.lockedReason ? reasonId : undefined} aria-disabled="true">{body}</div>}
      {needsPractice ? (
        <div className="lp-lesson__practice-link">
          <Link to={`/learn/lessons/${lesson.id}/practice`}>Mở luyện thêm</Link>
        </div>
      ) : null}
    </li>
  )
}

function unlockHints(lessons: LessonSummary[], reviews: ReviewRef[], testStatus: string) {
  if (testStatus !== 'LOCKED') return null
  const incomplete = lessons.filter((lesson) => lesson.status !== 'COMPLETED')
  const needPractice = lessons.filter((lesson) => lesson.status === 'COMPLETED' && lesson.practiceStatus === 'REQUIRED')
  const items: Array<{ key: string; text: string; to?: string }> = []

  if (incomplete.length > 0) {
    items.push({
      key: 'lessons',
      text: `Hoàn thành ${incomplete.length} bài học còn lại (vd. Bài ${incomplete[0]?.sortOrder}: ${incomplete[0]?.title}).`,
      to: `/learn/lessons/${incomplete[0].id}`,
    })
  }
  if (needPractice.length > 0) {
    items.push({
      key: 'practice',
      text: `Luyện thêm ${needPractice.length} bài đã học (practice REQUIRED) — vào trang luyện thêm của bài.`,
      to: `/learn/lessons/${needPractice[0].id}/practice`,
    })
  }
  if (reviews.length > 0) {
    items.push({
      key: 'review',
      text: `Hoàn thành ${reviews.length} bài ôn bắt buộc (review) trước khi mở đề.`,
      to: `/learn/reviews/${reviews[0].reviewId}`,
    })
  }
  if (items.length === 0) {
    items.push({
      key: 'generic',
      text: 'Hoàn thành mọi bài học, luyện thêm (nếu có) và bài ôn còn treo để mở đề cuối.',
    })
  }
  return items
}

function FinalTestCard({
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
  const hints = unlockHints(lessons, pendingReviews, test.testStatus)

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
        setMessage('Chưa có đề cho topic này. Hãy quay lại sau.')
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

  return (
    <section className={`lp-final lp-final--${test.testStatus.toLowerCase()}`} aria-labelledby="lp-final-title">
      <span className="lp-final__icon" aria-hidden="true"><Flag size={22} /></span>
      <div className="lp-final__body">
        <p className="lp-eyebrow">Bài kiểm tra cuối</p>
        <h2 id="lp-final-title">{test.title}</h2>
        <p>
          {test.questionCount} câu · cần đạt từ 70% · không giới hạn thời gian
          {test.lastPercent !== null ? ` · lần gần nhất ${test.lastPercent}%` : ''}
        </p>
        {hints ? (
          <div className="lp-final__unlock" role="status">
            <p className="lp-final__hint">Chưa mở đề — cần hoàn tất:</p>
            <ul>
              {hints.map((item) => (
                <li key={item.key}>
                  {item.to ? <Link to={item.to}>{item.text}</Link> : item.text}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {message ? <p className="lp-error" role="alert">{message}</p> : null}
      </div>
      <div className="lp-final__aside">
        <StatusBadge meta={testStatusMeta(test.testStatus)} />
        {test.testStatus === 'AVAILABLE' ? (
          <Button className="lp-btn lp-btn--accent lp-btn--cta" disabled={starting} onClick={startTest} type="button">
            {starting ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
            {starting ? 'Đang giao đề…' : 'Làm bài kiểm tra'}
          </Button>
        ) : null}
        {test.testStatus === 'NONE' ? (
          <p className="lp-final__hint">Topic này không có đề cuối (NO_TOPIC_TEST).</p>
        ) : null}
      </div>
    </section>
  )
}
