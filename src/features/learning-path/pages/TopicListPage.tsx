import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Crown, Flag, Loader2, Lock, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CourseSummary, TopicSummary } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, TopicListSkeleton } from '../components/PageState'
import { reportApiError } from '../lib/reviewGate'
import { topicStatusMeta } from '../lib/statusMeta'
import { useApiResource } from '../lib/useApiResource'

const SKILL_LABEL: Record<string, string> = {
  READING: 'Reading',
  LISTENING: 'Listening',
  WRITING: 'Writing',
  SPEAKING: 'Speaking',
  OTHER: 'Khác',
}

const SKILL_ORDER = ['LISTENING', 'READING', 'WRITING', 'SPEAKING']

/** Topics of one course, picked on the course list screen. */
export function TopicListPage() {
  const { courseId = '' } = useParams()
  const topicsResource = useApiResource('topics', () => learningApi.listTopics())
  const coursesResource = useApiResource('courses', () => learningApi.listCourses())
  const topics = topicsResource.data?.filter((topic) => topic.course?.id === courseId) ?? null
  const courseSummary = coursesResource.data?.find((row) => row.id === courseId) ?? null
  const course = courseSummary ?? topics?.[0]?.course ?? null
  const loading = topicsResource.status === 'loading' || coursesResource.status === 'loading'
  const error = topicsResource.error ?? coursesResource.error
  const passed = topics?.filter((topic) => topic.status === 'PASSED').length ?? 0
  const total = topics?.length ?? 0
  const pct = total === 0 ? 0 : Math.round((passed / total) * 100)
  const nextTopic = topics?.find((topic) => topic.status === 'IN_PROGRESS') ?? null

  return (
    <div className="lp-page lp-course-page">
      <NoticeBanner />
      <Link className="lp-back" to="/learn">
        <ArrowLeft aria-hidden="true" size={16} />
        Tất cả khóa học
      </Link>

      <header className="lp-overview">
        <div className="lp-overview__text">
          <p className="lp-eyebrow">{course ? `Band ${course.bandLevel.toFixed(1)} · Lộ trình khóa học` : 'Lộ trình khóa học'}</p>
          <h1>{course?.title ?? 'Lộ trình khóa học'}</h1>
          <p className="lp-overview__lead">
            Học lần lượt từng chặng. Hoàn thành các bài học và đạt bài kiểm tra chặng (từ 70%) để mở chặng tiếp theo.
          </p>
        </div>

        {topics && total > 0 ? (
          <div className="lp-overview__panel">
            <div className="lp-meter">
              <div className="lp-meter__row">
                <span><strong>{passed}/{total}</strong> chặng đã qua</span>
                <span className="lp-meter__value">{pct}%</span>
              </div>
              <progress className="lp-progress" max={100} value={pct}>{pct}%</progress>
            </div>
            {nextTopic ? (
              <>
                <p className="lp-overview__next">
                  <span>Tiếp theo</span>
                  Chặng {nextTopic.sequenceOrder}: {nextTopic.title}
                </p>
                <Button asChild className="lp-btn lp-btn--accent lp-btn--cta lp-overview__cta">
                  <Link to={`/learn/topics/${nextTopic.id}`}>
                    {nextTopic.completedLessons > 0 ? 'Học tiếp' : 'Bắt đầu chặng'}
                    <ArrowRight aria-hidden="true" size={18} />
                  </Link>
                </Button>
              </>
            ) : passed === total ? (
              <p className="lp-overview__done">
                <CheckCircle2 aria-hidden="true" size={18} />
                Bạn đã qua tất cả các chặng.
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      {loading ? <TopicListSkeleton /> : null}
      {error ? (
        <ApiErrorState
          error={error}
          onRetry={() => {
            topicsResource.reload()
            coursesResource.reload()
          }}
        />
      ) : null}
      {topics?.length === 0 ? <p className="lp-empty">Khóa này chưa có chặng nào.</p> : null}
      {topics && topics.length > 0 ? (
        <TopicCatalog
          finish={courseSummary && courseSummary.testStatus !== 'NONE' ? (
            <CourseFinalTestStop
              course={courseSummary}
              onChanged={() => {
                coursesResource.reload()
                topicsResource.reload()
              }}
            />
          ) : null}
          nextTopicId={nextTopic?.id ?? null}
          topics={topics}
        />
      ) : null}
    </div>
  )
}

function skillKey(topic: TopicSummary) {
  return topic.skill?.toUpperCase() || 'OTHER'
}

function skillLabel(skill: string | null | undefined) {
  if (!skill) return null
  return SKILL_LABEL[skill.toUpperCase()] ?? skill
}

function orderedSkills(topics: TopicSummary[]) {
  const present = new Set(topics.map(skillKey))
  return [
    ...SKILL_ORDER.filter((key) => present.has(key)),
    ...[...present].filter((key) => !SKILL_ORDER.includes(key)),
  ]
}

/** @deprecated Prefer TopicCatalog — kept for any external imports. */
export function TopicTrail({ topics }: { topics: TopicSummary[] }) {
  return <TopicCatalog topics={topics} />
}

export function TopicCardList({ topics }: { topics: TopicSummary[] }) {
  return <TopicCatalog topics={topics} />
}

function TopicCatalog({
  topics,
  nextTopicId = null,
  finish = null,
}: {
  topics: TopicSummary[]
  nextTopicId?: string | null
  finish?: ReactNode
}) {
  const [filter, setFilter] = useState('ALL')
  const skills = orderedSkills(topics)
  const visible = (filter === 'ALL' ? topics : topics.filter((topic) => skillKey(topic) === filter))
    .slice()
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)

  return (
    <section className="lp-section" aria-labelledby="lp-topics-title">
      <div className="lp-section__head">
        <h2 id="lp-topics-title">Các chặng</h2>
        {skills.length > 1 ? (
          <div className="lp-segment" role="group" aria-label="Lọc theo kỹ năng">
            <button aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')} type="button">Tất cả</button>
            {skills.map((key) => (
              <button aria-pressed={filter === key} key={key} onClick={() => setFilter(key)} type="button">
                {skillLabel(key) ?? key}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <ol className="lp-route" aria-label="Lộ trình các chặng">
        {visible.map((topic, index) => {
          const prev = visible[index - 1]
          const repeatsReason = topic.status === 'LOCKED' && prev?.status === 'LOCKED' && lockText(prev) === lockText(topic)
          return (
            <TopicStop
              index={index}
              isNext={topic.id === nextTopicId}
              key={topic.id}
              quietReason={repeatsReason}
              topic={topic}
            />
          )
        })}
        {finish}
      </ol>
    </section>
  )
}

function lockText(topic: TopicSummary) {
  return topic.lockedReason ?? 'Hoàn thành chặng trước để mở'
}

function TopicStop({
  topic,
  index,
  isNext,
  quietReason = false,
}: {
  topic: TopicSummary
  index: number
  isNext: boolean
  quietReason?: boolean
}) {
  const locked = topic.status === 'LOCKED'
  const passed = topic.status === 'PASSED'
  const premium = topic.accessLevel === 'PREMIUM' || topic.lockedReason?.includes('Premium')
  const reasonId = `${topic.id}-reason`
  const lessonPct = topic.totalLessons === 0 ? 0 : Math.round((topic.completedLessons / topic.totalLessons) * 100)
  const skill = skillLabel(topic.skill)
  const cta = passed ? 'Xem lại' : topic.completedLessons > 0 ? 'Học tiếp' : 'Vào chặng'

  const body = (
    <>
      <div className="lp-stop__head">
        <p className="lp-stop__kicker">
          Chặng {String(topic.sequenceOrder).padStart(2, '0')}
          {skill ? ` · ${skill}` : ''}
        </p>
        {premium ? (
          <span className="lp-chip lp-chip--locked">
            <Crown aria-hidden="true" size={12} />
            Premium
          </span>
        ) : null}
      </div>
      <h3 className="lp-stop__title">{topic.title}</h3>
      {topic.description ? <p className="lp-stop__desc">{topic.description}</p> : null}
      <div className="lp-stop__foot">
        {locked ? (
          <span className={quietReason ? 'lp-sr-only' : 'lp-stop__lock'} id={reasonId}>
            <Lock aria-hidden="true" size={14} />
            {lockText(topic)}
          </span>
        ) : passed ? (
          <span className="lp-stop__stat is-passed">
            <CheckCircle2 aria-hidden="true" size={15} />
            Đã qua · {topic.totalLessons} bài
          </span>
        ) : (
          <span className="lp-stop__stat">
            <progress className="lp-progress lp-progress--mini" max={100} value={lessonPct}>{lessonPct}%</progress>
            {topic.completedLessons}/{topic.totalLessons} bài
          </span>
        )}
        {!locked ? (
          <span className="lp-stop__go">
            {cta}
            <ArrowRight aria-hidden="true" size={15} />
          </span>
        ) : null}
      </div>
      <span className="lp-sr-only">Trạng thái: {topicStatusMeta(topic.status).label}</span>
    </>
  )

  return (
    <li
      className={`lp-stop lp-stop--${topic.status.toLowerCase()}${isNext ? ' is-next' : ''}`}
      style={{ '--i': index } as CSSProperties}
    >
      <span className="lp-stop__node" aria-hidden="true">
        {locked ? <Lock size={15} /> : passed ? <Check size={17} strokeWidth={2.75} /> : topic.sequenceOrder}
      </span>
      {locked ? (
        <div className="lp-stop__card" aria-describedby={reasonId} aria-disabled="true">{body}</div>
      ) : (
        <Link aria-current={isNext ? 'step' : undefined} className="lp-stop__card" to={`/learn/topics/${topic.id}`}>
          {body}
        </Link>
      )}
    </li>
  )
}

function CourseFinalTestStop({ course, onChanged }: { course: CourseSummary; onChanged: () => void }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const inFlight = useRef(false)
  const status = course.testStatus

  async function startTest() {
    if (inFlight.current) return
    inFlight.current = true
    setStarting(true)
    setMessage(null)
    try {
      const assignment = await learningApi.createCourseTestAssignment(course.id)
      const attempt = await learningApi.createAttempt({
        packageVersionId: assignment.packageVersionId,
        attemptType: 'COURSE_TEST',
        mode: 'STANDARD',
        channel: 'WEB',
        expiresAt: null,
      })
      navigate(`/learn/tests/${attempt.id}?course=${course.id}`)
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      if (error.code === 'TEST_LOCKED') {
        setMessage('Bài thi cuối khóa chưa mở. Hoàn thành mọi chặng trong khóa trước.')
        onChanged()
      } else if (error.code === 'TEST_UNAVAILABLE') {
        setMessage('Chưa có đề thi cuối cho khóa này. Hãy quay lại sau.')
      } else {
        setMessage(`${error.message} Hãy thử lại.`)
      }
      inFlight.current = false
      setStarting(false)
    }
  }

  const description = status === 'PASSED'
    ? 'Bạn đã đạt bài thi cuối khóa.'
    : status === 'AVAILABLE'
      ? 'Bạn đã qua mọi chặng. Đề tổng hợp theo band mục tiêu, cần đạt từ 70%.'
      : `Mở khi qua đủ ${course.topicCount} chặng (hiện ${course.passedTopicCount}/${course.topicCount}). Cần đạt từ 70%.`

  return (
    <li className={`lp-stop lp-stop--finish lp-finish--${status.toLowerCase()}`}>
      <span className="lp-stop__node" aria-hidden="true">
        {status === 'PASSED' ? <Trophy size={17} /> : <Flag size={16} />}
      </span>
      <section className="lp-finish" aria-labelledby="lp-course-final-title">
        <div className="lp-finish__head">
          <div className="lp-finish__text">
            <p className="lp-stop__kicker">Về đích</p>
            <h3 id="lp-course-final-title" className="lp-stop__title">Bài thi cuối khóa</h3>
            <p className="lp-finish__meta">{description}</p>
          </div>
          {status === 'AVAILABLE' ? (
            <Button className="lp-btn lp-btn--accent lp-btn--cta" disabled={starting} onClick={startTest} type="button">
              {starting ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
              {starting ? 'Đang giao đề…' : 'Làm bài thi cuối khóa'}
            </Button>
          ) : status === 'PASSED' ? (
            <span className="lp-chip lp-chip--success">Đã đạt</span>
          ) : null}
        </div>
        {message ? <p className="lp-error" role="alert">{message}</p> : null}
      </section>
    </li>
  )
}
