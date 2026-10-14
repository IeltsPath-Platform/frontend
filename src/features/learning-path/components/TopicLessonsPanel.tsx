import { useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Clock3, Dumbbell, Flag, Loader2, Lock, Trophy } from 'lucide-react'
import type { FinalTestSummary, LessonSummary } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { reportApiError, usePendingReviews } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'
import { lessonStatusMeta } from '../lib/statusMeta'

function needsPractice(lesson: LessonSummary) {
  return lesson.status === 'COMPLETED' && lesson.practiceStatus === 'REQUIRED'
}

/** Lessons of one topic, shown inside its expanded card on the course screen. Mount it only once the card is first opened. */
export function TopicLessonsPanel({ topicId }: { topicId: string }) {
  const resource = useApiResource(`topic:${topicId}`, () => learningApi.getTopicLessons(topicId))

  if (resource.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Đang tải danh sách bài học…" className="lp-lgrid lp-lgrid--loading">
        <span className="lp-skeleton-box" />
        <span className="lp-skeleton-box" />
        <span className="lp-skeleton-box" />
      </div>
    )
  }

  if (resource.status === 'error' || !resource.data) {
    return (
      <p className="lp-mini__error" role="alert">
        {resource.error?.message ?? 'Không tải được danh sách bài học.'}{' '}
        <button className="lp-mini__retry" onClick={resource.reload} type="button">Thử lại</button>
      </p>
    )
  }

  return <TopicLessonsView finalTest={resource.data.finalTest} lessons={resource.data.lessons} onChanged={resource.reload} topicId={topicId} />
}

/** The lessons and the topic test of one topic, once loaded. */
export function TopicLessonsView({
  lessons: unsorted,
  finalTest,
  topicId,
  onChanged,
  showCounts = true,
}: {
  lessons: LessonSummary[]
  finalTest: FinalTestSummary
  topicId: string
  onChanged: () => void
  /** The "4 bài học · khoảng 40 phút" line; off where the page already says it. */
  showCounts?: boolean
}) {
  const lessons = [...unsorted].sort((a, b) => a.sortOrder - b.sortOrder)
  if (lessons.length === 0) return <p className="lp-mini__empty">Chặng này chưa có bài học.</p>

  const nextId = (lessons.find((lesson) => lesson.status === 'AVAILABLE') ?? lessons.find(needsPractice))?.id ?? null
  const totalMinutes = lessons.reduce((sum, lesson) => sum + (lesson.estimatedMinutes || 0), 0)

  return (
    <>
      {showCounts ? (
        <div className="lp-panelhead">
          <span>{lessons.length} bài học</span>
          {totalMinutes > 0 ? (
            <span>
              <Clock3 aria-hidden="true" size={13} />
              khoảng {totalMinutes} phút
            </span>
          ) : null}
        </div>
      ) : null}

      <ol className="lp-lgrid" aria-label="Danh sách bài học">
        {lessons.map((lesson, index) => (
          <LessonTile index={index} isNext={lesson.id === nextId} key={lesson.id} lesson={lesson} />
        ))}
      </ol>

      <SummitTile lessons={lessons} onChanged={onChanged} test={finalTest} topicId={topicId} />
    </>
  )
}

function LessonTile({ lesson, isNext, index }: { lesson: LessonSummary; isNext: boolean; index: number }) {
  const locked = lesson.status === 'LOCKED'
  const completed = lesson.status === 'COMPLETED'
  const practice = needsPractice(lesson)
  const reasonId = `${lesson.id}-tile-reason`
  const action = practice ? 'Luyện thêm' : isNext ? 'Học tiếp' : completed ? 'Xem lại' : 'Mở bài'

  const inner = (
    <>
      <span className="lp-ltile__node" aria-hidden="true">
        {locked ? <Lock size={14} /> : completed ? <Check size={16} strokeWidth={3} /> : lesson.sortOrder}
      </span>

      <span className="lp-ltile__main">
        <span className="lp-ltile__title">{lesson.title}</span>
        <span className="lp-ltile__meta">
          <span className="lp-ltile__time">
            <Clock3 aria-hidden="true" size={13} />
            {lesson.estimatedMinutes} phút
          </span>
          {isNext && !practice ? <span className="lp-ltile__badge">Tiếp theo</span> : null}
          {completed && !practice ? <span className="lp-ltile__badge is-done">Đã xong</span> : null}
          {practice ? (
            <span className="lp-ltile__badge is-practice">
              <Dumbbell aria-hidden="true" size={11} />
              Cần luyện thêm
            </span>
          ) : null}
          {locked ? <span className="lp-ltile__reason" id={reasonId}>{lesson.lockedReason ?? 'Chưa mở'}</span> : null}
        </span>
      </span>

      {!locked ? (
        <span className="lp-ltile__go">
          {action}
          <ArrowRight aria-hidden="true" size={14} />
        </span>
      ) : null}
      <span className="lp-sr-only">Bài {lesson.sortOrder}, {lessonStatusMeta(lesson.status).label}</span>
    </>
  )

  const className = `lp-ltile${isNext ? ' is-next' : ''}${completed ? ' is-done' : ''}${locked ? ' is-locked' : ''}`
  const style = { '--i': index } as CSSProperties

  return (
    <li style={style}>
      {locked ? (
        <div aria-describedby={reasonId} aria-disabled="true" className={className}>
          {inner}
        </div>
      ) : (
        <Link
          aria-current={isNext ? 'step' : undefined}
          className={className}
          to={practice ? `/learn/lessons/${lesson.id}?view=practice` : `/learn/lessons/${lesson.id}`}
        >
          {inner}
        </Link>
      )}
    </li>
  )
}

/** The topic test, drawn as the summit the lessons climb to. When it is open, this tile starts it. */
function SummitTile({
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
  if (test.testStatus === 'NONE') return null
  const status = test.testStatus

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
    test.lastPercent !== null ? `lần gần nhất ${test.lastPercent}%` : null,
  ].filter(Boolean).join(' · ')
  const text =
    status === 'PASSED'
      ? `Đã đạt${test.lastPercent !== null ? ` · ${test.lastPercent}%` : ''}`
      : status === 'AVAILABLE'
        ? meta
        : 'Mở khi bạn hoàn thành mọi bài học, phần luyện thêm và bài ôn trong chặng'

  const inner = (
    <>
      <span className="lp-summit__icon" aria-hidden="true">
        {status === 'PASSED' ? <Trophy size={18} /> : <Flag size={18} />}
      </span>
      <span className="lp-summit__text">
        <span className="lp-summit__title">Bài kiểm tra chặng</span>
        <span className="lp-summit__note">{text}</span>
      </span>
      {status === 'AVAILABLE' ? (
        <span className="lp-summit__go">
          {starting ? <Loader2 aria-hidden="true" className="lp-spin" size={15} /> : null}
          {starting ? 'Đang giao đề…' : 'Làm bài kiểm tra'}
          {starting ? null : <ArrowRight aria-hidden="true" size={15} />}
        </span>
      ) : status === 'PASSED' ? (
        <span className="lp-chip lp-chip--success">Đã đạt</span>
      ) : (
        <Lock aria-hidden="true" className="lp-summit__lock" size={16} />
      )}
    </>
  )

  const className = `lp-summit lp-summit--${status.toLowerCase()}`
  return (
    <>
      {status === 'AVAILABLE' ? (
        <button className={className} disabled={starting} onClick={startTest} type="button">{inner}</button>
      ) : (
        <div aria-disabled={status === 'LOCKED' ? 'true' : undefined} className={className}>{inner}</div>
      )}
      {message ? <p className="lp-summit__error lp-error" role="alert">{message}</p> : null}
    </>
  )
}
