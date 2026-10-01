import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock3, Flag, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FinalTestSummary, LessonSummary, TopicLessonsResponse } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import { reportApiError } from '../lib/reviewGate'
import { lessonStatusMeta, testStatusMeta, topicStatusMeta } from '../lib/statusMeta'
import { useApiResource } from '../lib/useApiResource'
import { useSyncPendingReviews } from '../lib/useSyncPendingReviews'

export function TopicDetailPage() {
  const { topicId = '' } = useParams()
  const resource = useApiResource(`topic:${topicId}`, () => learningApi.getTopicLessons(topicId))
  useSyncPendingReviews(resource.status === 'success' ? resource.data?.pendingReviews : undefined)

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
      <FinalTestCard onChanged={onChanged} test={finalTest} topicId={topic.id} />
    </div>
  )
}

function LessonRow({ lesson }: { lesson: LessonSummary }) {
  const meta = lessonStatusMeta(lesson.status)
  const openable = lesson.status !== 'LOCKED'
  const reasonId = `${lesson.id}-reason`
  const body = (
    <>
      <span className="lp-lesson__num" aria-hidden="true">{lesson.status === 'LOCKED' ? <Lock size={16} /> : lesson.sortOrder}</span>
      <span className="lp-lesson__main">
        <span className="lp-lesson__title">Bài {lesson.sortOrder}: {lesson.title}</span>
        <span className="lp-lesson__meta"><Clock3 aria-hidden="true" size={14} />{lesson.estimatedMinutes} phút</span>
        {!openable && lesson.lockedReason ? <span className="lp-lesson__reason" id={reasonId}>{lesson.lockedReason}</span> : null}
      </span>
      <StatusBadge meta={meta} />
    </>
  )
  return (
    <li className={`lp-lesson lp-lesson--${lesson.status.toLowerCase()}`}>
      {openable
        ? <Link className="lp-lesson__row" to={`/learn/lessons/${lesson.id}`}>{body}</Link>
        : <div className="lp-lesson__row" aria-describedby={lesson.lockedReason ? reasonId : undefined} aria-disabled="true">{body}</div>}
    </li>
  )
}

function FinalTestCard({ test, topicId, onChanged }: { test: FinalTestSummary; topicId: string; onChanged: () => void }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const inFlight = useRef(false)

  async function startTest() {
    if (inFlight.current) return
    inFlight.current = true
    setStarting(true)
    setMessage(null)
    try {
      const assignment = await learningApi.createTestAssignment(topicId)
      const attempt = await learningApi.createAttempt({
        packageVersionId: assignment.packageVersionId, attemptType: 'TOPIC_TEST', mode: 'PRACTICE', channel: 'WEB', expiresAt: null,
      })
      navigate(`/learn/tests/${attempt.id}?topic=${topicId}`)
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      if (error.code === 'TEST_UNAVAILABLE') setMessage('Chưa có đề cho topic này. Hãy quay lại sau.')
      else if (error.code === 'REVIEW_REQUIRED') setMessage('Cần làm bài ôn trước khi làm bài kiểm tra.')
      else if (error.code === 'TEST_LOCKED') { setMessage('Bài kiểm tra chưa mở. Hoàn thành mọi bài học trước.'); onChanged() }
      else setMessage(`${error.message} Hãy thử lại.`)
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
        {test.testStatus === 'LOCKED' ? <p className="lp-final__hint">Hoàn thành mọi bài học (và bài ôn nếu có) để mở.</p> : null}
        {message ? <p className="lp-error" role="alert">{message}</p> : null}
      </div>
      <div className="lp-final__aside">
        <StatusBadge meta={testStatusMeta(test.testStatus)} />
        {test.testStatus === 'AVAILABLE' ? (
          <Button className="lp-btn lp-btn--accent" disabled={starting} onClick={startTest} type="button">
            {starting ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
            {starting ? 'Đang giao đề…' : 'Làm bài kiểm tra'}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
