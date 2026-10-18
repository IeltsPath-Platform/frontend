import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Dumbbell, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LearnerTree, TreePoint } from '~types/learningPath'
import { learningApi, toApiError, userMessage, type ApiError } from '../api'
import { HeartsPanel } from '../components/HeartsPanel'
import { LearnTrail } from '../components/LearnTrail'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { skillLabel } from '../lib/courseMeta'
import { freePracticePath, knowledgeTreePath, type FreePracticeNavigationState } from '../lib/routes'
import { reportApiError } from '../lib/reviewGate'
import { masteryPercent, orderedTreeSkills, prerequisiteNames, tierMeta, visiblePoints } from '../lib/treeMeta'
import { useApiResource } from '../lib/useApiResource'

/** The learner's knowledge points of one course: where they stand on each, and a way into free practice. */
export function KnowledgeTreePage() {
  const { courseId = '' } = useParams()
  const tree = useApiResource(`tree:${courseId}`, () => learningApi.getLearnerTree(courseId))
  const courses = useApiResource('courses', () => learningApi.listCourses())
  const hearts = useApiResource('hearts', () => learningApi.getHearts())
  const course = courses.data?.find((row) => row.id === courseId) ?? null
  const courseLabel = course?.title ?? 'Lộ trình khóa học'

  return (
    <div className="lp-page lp-tree-page">
      <LearnTrail
        items={[
          { label: 'Khóa học', to: '/learn' },
          { label: courseLabel, to: `/learn/courses/${courseId}` },
          { label: 'Cây kiến thức' },
        ]}
      />
      <header className="lp-lesson-head">
        <p className="lp-eyebrow">{course?.title ?? 'Khóa học'}</p>
        <h1>Cây kiến thức</h1>
        <p>Mỗi ô là một điểm kiến thức. Luyện tự do không khóa bài học của bạn, nhưng trả lời sai vẫn mất tim.</p>
      </header>

      {hearts.data && hearts.data.hearts === 0 ? <HeartsPanel onChanged={hearts.reload} status={hearts.data} /> : null}

      {tree.status === 'loading' ? <LoadingState label="Đang tải cây kiến thức…" /> : null}
      {tree.error ? <TreeLoadError error={tree.error} onRetry={tree.reload} /> : null}
      {tree.data ? (
        <TreeView
          backTo={knowledgeTreePath(courseId)}
          depleted={hearts.data?.hearts === 0}
          onHeartsChanged={hearts.reload}
          tree={tree.data}
        />
      ) : null}
    </div>
  )
}

/** A course the learner cannot open gets its own words; any other failure takes the shared error panel. */
function TreeLoadError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  if (error.code !== 'COURSE_NOT_OPEN' && error.code !== 'COURSE_NOT_JOINED') {
    return <ApiErrorState error={error} onRetry={onRetry} />
  }
  return (
    <section className="lp-state lp-state--panel" aria-labelledby="lp-tree-closed">
      <Lock aria-hidden="true" size={26} />
      <h2 id="lp-tree-closed">Chưa xem được cây kiến thức</h2>
      <p>{userMessage(error)}</p>
      <Button asChild className="lp-btn"><Link to="/learn">Về danh sách khóa học</Link></Button>
    </section>
  )
}

function TreeView({ tree, backTo, depleted, onHeartsChanged }: {
  tree: LearnerTree
  backTo: string
  depleted: boolean
  onHeartsChanged: () => void
}) {
  const [skill, setSkill] = useState('ALL')
  const points = tree.knowledgePoints
  const byId = new Map(points.map((point) => [point.knowledgePointId, point]))
  const skills = orderedTreeSkills(points)
  const visible = visiblePoints(points, skill)
  const needWork = points.filter((point) => point.tier === 'PRIORITY').length

  if (points.length === 0) return <p className="lp-empty">Khóa này chưa có điểm kiến thức nào.</p>

  return (
    <section className="lp-section" aria-labelledby="lp-tree-title">
      <div className="lp-section__head">
        <h2 id="lp-tree-title">{points.length} điểm kiến thức</h2>
        {skills.length > 1 ? (
          <div className="lp-segment" role="group" aria-label="Lọc theo kỹ năng">
            <button aria-pressed={skill === 'ALL'} onClick={() => setSkill('ALL')} type="button">Tất cả</button>
            {skills.map((key) => (
              <button aria-pressed={skill === key} key={key} onClick={() => setSkill(key)} type="button">
                {skillLabel(key) ?? key}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <p className="lp-hint" role="status">
        {needWork > 0 ? `${needWork} điểm cần ưu tiên.` : 'Chưa có điểm nào cần ưu tiên.'}
      </p>
      <ul className="lp-tree" aria-label="Các điểm kiến thức">
        {visible.map((point) => (
          <PointCard
            backTo={backTo}
            depleted={depleted}
            key={point.knowledgePointId}
            onHeartsChanged={onHeartsChanged}
            point={point}
            prerequisites={prerequisiteNames(point, byId)}
          />
        ))}
      </ul>
    </section>
  )
}

function PointCard({ point, prerequisites, backTo, depleted, onHeartsChanged }: {
  point: TreePoint
  prerequisites: string[]
  backTo: string
  depleted: boolean
  onHeartsChanged: () => void
}) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const inFlight = useRef(false)
  const tier = tierMeta(point.tier)
  const percent = masteryPercent(point.mastery)
  const noteId = `${point.knowledgePointId}-note`
  const review = failure?.code === 'REVIEW_REQUIRED' ? failure.details.reviews?.[0] : undefined

  async function practise() {
    if (inFlight.current) return
    inFlight.current = true
    setStarting(true)
    setFailure(null)
    try {
      const attempt = await learningApi.startFreePractice(point.knowledgePointId)
      navigate(freePracticePath(attempt.attemptId), {
        state: { freePractice: { pointName: point.name, pointCode: point.code, backTo } } satisfies FreePracticeNavigationState,
      })
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      setFailure(error)
      if (error.code === 'HEARTS_DEPLETED') onHeartsChanged()
      inFlight.current = false
      setStarting(false)
    }
  }

  return (
    <li className="lp-point">
      <div className="lp-point__head">
        <div>
          <h3 className="lp-point__name">{point.name}</h3>
          <p className="lp-point__code">{point.code}</p>
        </div>
        <span className={`lp-chip lp-chip--${tier.chip}`} title={tier.hint}>{tier.label}</span>
      </div>

      {point.canDo ? <p className="lp-point__cando">{point.canDo}</p> : null}

      <div className="lp-point__meta">
        {point.cefrLevel ? <span className="lp-chip lp-chip--primary">{point.cefrLevel}</span> : null}
        {percent !== null ? (
          <label className="lp-point__meter">
            <span>Mức nắm {percent}%</span>
            <meter max={1} min={0} value={point.mastery ?? 0} />
          </label>
        ) : null}
        {point.nextReviewAt ? (
          <span className="lp-point__review">Ôn lại: {new Date(point.nextReviewAt).toLocaleDateString('vi-VN')}</span>
        ) : null}
      </div>

      {prerequisites.length > 0 ? (
        <p className="lp-point__needs">Xây trên: {prerequisites.join(', ')}</p>
      ) : null}

      <div className="lp-point__actions">
        <Button
          aria-describedby={noteId}
          className="lp-btn lp-btn--accent"
          disabled={!point.practiceAvailable || starting || depleted}
          onClick={() => void practise()}
          type="button"
        >
          {starting ? <Loader2 aria-hidden="true" className="lp-spin" size={16} /> : <Dumbbell aria-hidden="true" size={16} />}
          {starting ? 'Đang mở bộ…' : 'Luyện'}
        </Button>
        <span className="lp-hint" id={noteId}>
          {depleted
            ? 'Hết tim, hồi tim để luyện.'
            : !point.practiceAvailable
              ? 'Đã hết bộ luyện tự do, các bộ còn lại dành cho bài ôn.'
              : point.evidenceCount > 0 ? `${point.evidenceCount} lượt làm` : 'Chưa làm lượt nào'}
        </span>
      </div>

      {failure ? (
        <p className="lp-error" role="alert">
          {userMessage(failure)}
          {review ? <> <Link to={`/learn/reviews/${review.reviewId}`}>Làm bài ôn</Link></> : null}
        </p>
      ) : null}
    </li>
  )
}
