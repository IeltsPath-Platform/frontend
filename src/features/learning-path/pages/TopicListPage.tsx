import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, Check, Crown, Flag, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CourseSummary, TopicSummary } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { NoticeBanner } from '../components/NoticeBanner'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import { reportApiError } from '../lib/reviewGate'
import { topicStatusMeta, testStatusMeta } from '../lib/statusMeta'
import { useApiResource } from '../lib/useApiResource'

const SKILL_LABEL: Record<string, string> = {
  READING: 'Reading',
  LISTENING: 'Listening',
  WRITING: 'Writing',
  SPEAKING: 'Speaking',
  OTHER: 'Khác',
}

/** Topics of one course, picked on the course list screen. */
export function TopicListPage() {
  const { courseId = '' } = useParams()
  const topicsResource = useApiResource('topics', () => learningApi.listTopics())
  const coursesResource = useApiResource('courses', () => learningApi.listCourses())
  const topics = topicsResource.data?.filter((topic) => topic.course?.id === courseId) ?? null
  const course = coursesResource.data?.find((row) => row.id === courseId)
    ?? topics?.[0]?.course
    ?? null
  const courseSummary = coursesResource.data?.find((row) => row.id === courseId) ?? null
  const loading = topicsResource.status === 'loading' || coursesResource.status === 'loading'
  const error = topicsResource.error ?? coursesResource.error
  const passed = topics?.filter((topic) => topic.status === 'PASSED').length ?? 0
  const total = topics?.length ?? 0
  const pct = total === 0 ? 0 : Math.round((passed / total) * 100)

  return (
    <div className="lp-page">
      <NoticeBanner />
      <Link className="lp-back" to="/learn"><ArrowLeft aria-hidden="true" size={16} />Danh sách khóa học</Link>
      <header className="lp-course-head">
        <div>
          <p className="lp-eyebrow">{course ? `Khóa học · Band ${course.bandLevel.toFixed(1)}` : 'Khóa học'}</p>
          <h1>{course?.title ?? 'Lộ trình của khóa'}</h1>
          <p>Mỗi topic là một chặng. Học hết bài và đạt kiểm tra cuối để mở chặng tiếp theo.</p>
        </div>
        {topics ? (
          <div className="lp-course-head__meter">
            <strong>{passed}/{total}</strong>
            <span>chặng đã qua</span>
            <progress className="lp-progress" max={100} value={pct}>{pct}%</progress>
          </div>
        ) : null}
      </header>
      {loading ? <LoadingState label="Đang tải lộ trình…" /> : null}
      {error ? (
        <ApiErrorState
          error={error}
          onRetry={() => {
            topicsResource.reload()
            coursesResource.reload()
          }}
        />
      ) : null}
      {topics?.length === 0 ? <p className="lp-empty">Khóa này chưa có topic nào.</p> : null}
      {topics && topics.length > 0 ? <TopicCatalog topics={topics} /> : null}
      {courseSummary ? (
        <CourseFinalTestCard
          course={courseSummary}
          onChanged={() => {
            coursesResource.reload()
            topicsResource.reload()
          }}
        />
      ) : null}
    </div>
  )
}

const SKILL_ORDER = ['LISTENING', 'READING', 'WRITING', 'SPEAKING']

function skillKey(topic: TopicSummary) {
  return topic.skill?.toUpperCase() || 'OTHER'
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

function TopicCatalog({ topics }: { topics: TopicSummary[] }) {
  const [filter, setFilter] = useState('ALL')
  const skills = orderedSkills(topics)
  const visible = [...(filter === 'ALL' ? topics : topics.filter((topic) => skillKey(topic) === filter))]
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)

  return (
    <div className="lp-skill-catalog">
      {skills.length > 1 ? (
        <div className="lp-skill-filters" role="group" aria-label="Lọc theo kỹ năng">
          <button aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')} type="button">Tất cả</button>
          {skills.map((key) => (
            <button aria-pressed={filter === key} key={key} onClick={() => setFilter(key)} type="button">
              {skillLabel(key) ?? key}
            </button>
          ))}
        </div>
      ) : null}
      <ol className="lp-path" aria-label="Lộ trình topic">
        {visible.map((topic, index) => <PathNode index={index} key={topic.id} topic={topic} />)}
      </ol>
    </div>
  )
}

function skillLabel(skill: string | null | undefined) {
  if (!skill) return null
  return SKILL_LABEL[skill.toUpperCase()] ?? skill
}

function PathNode({ topic, index }: { topic: TopicSummary; index: number }) {
  const meta = topicStatusMeta(topic.status)
  const locked = topic.status === 'LOCKED'
  const premium = topic.accessLevel === 'PREMIUM' || topic.lockedReason?.includes('Premium')
  const reasonId = `${topic.id}-reason`
  const lessonPct = topic.totalLessons === 0
    ? 0
    : Math.round((topic.completedLessons / topic.totalLessons) * 100)
  const skill = skillLabel(topic.skill)
  const cta = locked
    ? null
    : topic.status === 'PASSED'
      ? 'Xem lại'
      : topic.completedLessons > 0
        ? 'Tiếp tục'
        : 'Bắt đầu'

  const card = (
    <>
      <div className="lp-path-node__top">
        <div className="lp-path-node__tags">
          {skill ? <span className="lp-badge lp-tone-primary">{skill}</span> : null}
          {premium ? <span className="lp-badge lp-tone-locked"><Crown aria-hidden="true" size={12} />Premium</span> : null}
          {!premium && topic.accessLevel === 'FREE' ? <span className="lp-badge lp-tone-success">FREE</span> : null}
        </div>
        <StatusBadge meta={meta} />
      </div>
      <h2>{topic.title}</h2>
      {topic.description ? <p>{topic.description}</p> : null}
      <div className="lp-path-node__progress">
        <div className="lp-path-node__progress-row">
          <span>{topic.completedLessons}/{topic.totalLessons} bài</span>
          <span className="lp-path-node__code">{topic.code}</span>
        </div>
        <progress className="lp-progress" max={100} value={locked ? 0 : lessonPct}>{lessonPct}%</progress>
      </div>
      {locked && topic.lockedReason ? (
        <p className="lp-path-node__reason" id={reasonId}>{topic.lockedReason}</p>
      ) : null}
      {cta ? (
        <span className="lp-path-node__cta">
          {cta}
          <ArrowRight aria-hidden="true" size={18} />
        </span>
      ) : (
        <span className="lp-path-node__cta"><Lock aria-hidden="true" size={16} />Đang khóa</span>
      )}
    </>
  )

  return (
    <li
      className={`lp-path-node lp-path-node--${topic.status.toLowerCase()}`}
      style={{ '--i': index } as CSSProperties}
    >
      <span className="lp-path-node__dot" aria-hidden="true">
        {locked ? <Lock size={18} /> : topic.status === 'PASSED' ? <Check size={20} /> : topic.sequenceOrder}
      </span>
      {locked ? (
        <div className="lp-path-node__card" aria-describedby={topic.lockedReason ? reasonId : undefined} aria-disabled="true">
          {card}
        </div>
      ) : (
        <Link className="lp-path-node__card" to={`/learn/topics/${topic.id}`}>{card}</Link>
      )}
    </li>
  )
}

function CourseFinalTestCard({
  course,
  onChanged,
}: {
  course: CourseSummary
  onChanged: () => void
}) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const inFlight = useRef(false)

  if (course.testStatus === 'NONE') return null

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
        setMessage('Bài thi cuối khóa chưa mở. Hoàn thành mọi topic trong khóa trước.')
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

  return (
    <section className={`lp-final lp-final--${course.testStatus.toLowerCase()}`} aria-labelledby="lp-course-final-title">
      <span className="lp-final__icon" aria-hidden="true"><Flag size={22} /></span>
      <div className="lp-final__body">
        <p className="lp-eyebrow">Thi cuối khóa</p>
        <h2 id="lp-course-final-title">Bài kiểm tra cuối · {course.title}</h2>
        <p>
          Mở khi mọi topic đã qua · cần đạt từ 70% · không khóa khóa học khác
          {course.testStatus === 'LOCKED'
            ? ` · tiến độ ${course.passedTopicCount}/${course.topicCount} topic`
            : ''}
        </p>
        {course.testStatus === 'LOCKED' ? (
          <p className="lp-final__hint">Hoàn thành tất cả topic trong khóa để mở đề.</p>
        ) : null}
        {message ? <p className="lp-error" role="alert">{message}</p> : null}
      </div>
      <div className="lp-final__aside">
        <StatusBadge meta={testStatusMeta(course.testStatus)} />
        {course.testStatus === 'AVAILABLE' ? (
          <Button className="lp-btn lp-btn--accent lp-btn--cta" disabled={starting} onClick={startTest} type="button">
            {starting ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
            {starting ? 'Đang giao đề…' : 'Làm bài thi cuối'}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
