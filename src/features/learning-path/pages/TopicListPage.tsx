import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, CheckCircle2, ChevronDown, Crown, Flag, Loader2, Lock, Network, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CourseSummary, TopicSummary } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { CourseHero } from '../components/CourseHero'
import { LearnTrail } from '../components/LearnTrail'
import { NoticeBanner } from '../components/NoticeBanner'
import { SegmentMeter } from '../components/SegmentMeter'
import { TopicLessonsPanel } from '../components/TopicLessonsPanel'
import { ApiErrorState, TopicListSkeleton } from '../components/PageState'
import { reportApiError } from '../lib/reviewGate'
import { knowledgeTreePath } from '../lib/routes'
import { topicStatusMeta } from '../lib/statusMeta'
import { skillLabel } from '../lib/courseMeta'
import { useApiResource } from '../lib/useApiResource'

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
  const nextTopic = topics?.find((topic) => topic.status === 'IN_PROGRESS') ?? null

  return (
    <div className="lp-page lp-course-page">
      <NoticeBanner />
      <LearnTrail items={[{ label: 'Khóa học', to: '/learn' }, { label: course?.title ?? 'Lộ trình khóa học' }]} />

      <CourseHero
        course={course}
        done={total > 0 && passed === total}
        topicCount={total}
      />

      {total > 0 ? (
        <p className="lp-course-tree-link">
          <Button asChild className="lp-btn">
            <Link to={knowledgeTreePath(courseId)}><Network aria-hidden="true" size={16} />Cây kiến thức và luyện tự do</Link>
          </Button>
        </p>
      ) : null}

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
  // Topics start collapsed so the whole route is visible at a glance. Only a topic named in `?topic=`
  // (coming back from one of its lessons or tests) starts open.
  const [searchParams] = useSearchParams()
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => {
    const requested = searchParams.get('topic')
    return new Set(requested ? [requested] : [])
  })
  const skills = orderedSkills(topics)
  const visible = (filter === 'ALL' ? topics : topics.filter((topic) => skillKey(topic) === filter))
    .slice()
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)

  function toggleTopic(topicId: string) {
    setOpenIds((current) => {
      const next = new Set(current)
      if (!next.delete(topicId)) next.add(topicId)
      return next
    })
  }

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
              onToggle={() => toggleTopic(topic.id)}
              open={openIds.has(topic.id)}
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
  open,
  onToggle,
  quietReason = false,
}: {
  topic: TopicSummary
  index: number
  isNext: boolean
  open: boolean
  onToggle: () => void
  quietReason?: boolean
}) {
  const locked = topic.status === 'LOCKED'
  const passed = topic.status === 'PASSED'
  const progress = passed ? 1 : locked || topic.totalLessons <= 0
    ? 0
    : Math.min(1, Math.max(0, topic.completedLessons / topic.totalLessons))
  const premium = topic.accessLevel === 'PREMIUM' || topic.lockedReason?.includes('Premium')
  const reasonId = `${topic.id}-reason`
  const panelId = `${topic.id}-lessons`
  const skill = skillLabel(topic.skill)
  // Lessons load the first time a card opens and stay mounted afterwards, so closing and reopening costs nothing.
  const [loaded, setLoaded] = useState(open)
  if (open && !loaded) setLoaded(true)

  const summary = (
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
            <SegmentMeter done={topic.completedLessons} total={topic.totalLessons} unit="bài" />
            {topic.completedLessons}/{topic.totalLessons} bài
          </span>
        )}
      </div>
      <span className="lp-sr-only">Trạng thái: {topicStatusMeta(topic.status).label}</span>
    </>
  )

  return (
    <li
      className={`lp-stop lp-stop--${topic.status.toLowerCase()}${isNext ? ' is-next' : ''}${open && !locked ? ' is-open' : ''}`}
      style={{ '--i': index, '--topic-progress': progress } as CSSProperties}
    >
      <span className="lp-stop__node" aria-hidden="true">
        {locked ? <Lock size={15} /> : passed ? <Check size={17} strokeWidth={2.75} /> : topic.sequenceOrder}
      </span>

      {locked ? (
        <div className="lp-stop__card" aria-describedby={reasonId} aria-disabled="true">
          <div className="lp-stop__summary">
            <div className="lp-stop__toggle">{summary}</div>
          </div>
        </div>
      ) : (
        <div className="lp-stop__card">
          <div className="lp-stop__summary">
            <button
              aria-controls={panelId}
              aria-current={isNext ? 'step' : undefined}
              aria-expanded={open}
              className="lp-stop__toggle"
              onClick={onToggle}
              type="button"
            >
              {summary}
              <span className="lp-stop__chevron" aria-hidden="true">
                <span>{open ? 'Thu gọn' : 'Xem bài học'}</span>
                <ChevronDown size={16} />
              </span>
            </button>
          </div>

          <div className="lp-stop__panel" data-open={open} id={panelId} inert={!open}>
            <div className="lp-stop__panel-inner">
              {loaded ? <TopicLessonsPanel topicId={topic.id} /> : null}
            </div>
          </div>
        </div>
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
