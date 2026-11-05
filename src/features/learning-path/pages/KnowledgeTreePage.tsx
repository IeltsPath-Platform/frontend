import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, ChevronDown, CornerLeftUp, Headphones, Languages, Layers, Lock, Mic, Network, PenLine, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LearnerTree, TreePoint } from '~types/learningPath'
import { learningApi, userMessage, type ApiError } from '../api'
import { HeartsPanel } from '../components/HeartsPanel'
import { KnowledgeTreeChart } from '../components/KnowledgeTreeChart'
import { LearnTrail } from '../components/LearnTrail'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { PointDetail } from '../components/PointDetail'
import { PointLessons } from '../components/PointLessons'
import { PracticeButton, PracticeFeedback } from '../components/PointPractice'
import { skillLabel } from '../lib/courseMeta'
import { knowledgeTreePath } from '../lib/routes'
import { TIER_ICON } from '../lib/tierIcon'
import { defaultSelection, dependentsOf, learningOrder } from '../lib/treeChart'
import {
  chapterLabel, countByTierGroup, masteryPercent, orderedTreeSkills, pointSkill, prerequisiteNames, prerequisiteSteps, TIER_GROUPS,
  tierGroup, tierMeta, visiblePoints,
} from '../lib/treeMeta'
import { useApiResource } from '../lib/useApiResource'
import { practiceNote, usePointPractice } from '../lib/usePointPractice'
import { useMediaQuery } from '../lib/useMediaQuery'
import styles from './KnowledgeTreePage.module.css'

const SKILL_ICONS: Record<string, LucideIcon> = {
  LISTENING: Headphones, READING: BookOpen, WRITING: PenLine, SPEAKING: Mic, GRAMMAR: Languages, VOCABULARY: Layers,
}

/** Below this width the chart would have to pan sideways all the time, so the points are listed step by step instead. */
const CHART_MIN_WIDTH = '(min-width: 48rem)'

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
        <p>Khám phá từng nhánh kỹ năng và điểm kiến thức. Luyện tự do không khóa bài học, nhưng trả lời sai vẫn mất tim.</p>
      </header>

      {hearts.data && hearts.data.hearts === 0 ? <HeartsPanel onChanged={hearts.reload} status={hearts.data} /> : null}

      {tree.status === 'loading' ? <LoadingState label="Đang tải cây kiến thức…" /> : null}
      {tree.error ? <TreeLoadError error={tree.error} onRetry={tree.reload} /> : null}
      {tree.data ? (
        <TreeView
          backTo={knowledgeTreePath(courseId)}
          courseName={courseLabel}
          courseId={courseId}
          depleted={hearts.data?.hearts === 0}
          onHeartsChanged={hearts.reload}
          onCourseChanged={tree.reload}
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

interface ViewProps {
  courseName: string
  courseId: string
  backTo: string
  depleted: boolean
  onHeartsChanged: () => void
  onCourseChanged: () => void
}

function TreeView({ tree, ...view }: ViewProps & { tree: LearnerTree }) {
  const wide = useMediaQuery(CHART_MIN_WIDTH)
  const [choice, setChoice] = useState<string | null>(null)
  const points = tree.knowledgePoints
  const skills = orderedTreeSkills(points)
  // One skill's chart is as wide as a screen can show; the whole course in one chart would not be. The list shows all.
  const skill = choice ?? (wide && skills.length > 1 ? skills[0]! : 'ALL')
  const visible = visiblePoints(points, skill)

  if (points.length === 0) return <p className="lp-empty">Khóa này chưa có điểm kiến thức nào.</p>

  return (
    <section className={`lp-section ${styles.panel}`} aria-labelledby="lp-tree-title">
      <div className="lp-section__head">
        <h2 id="lp-tree-title">{points.length} điểm kiến thức</h2>
        {skills.length > 1 ? (
          <div className="lp-segment" role="group" aria-label="Lọc theo kỹ năng">
            <button aria-pressed={skill === 'ALL'} onClick={() => setChoice('ALL')} type="button">Tất cả</button>
            {skills.map((key) => (
              <button aria-pressed={skill === key} key={key} onClick={() => setChoice(key)} type="button">
                {skillLabel(key) ?? key}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {wide
        ? <ChartView {...view} allPoints={points} points={visible} skill={skill} />
        : <ListView {...view} allPoints={points} points={visible} />}
    </section>
  )
}

/** How many points sit in each mastery group: a ribbon in proportion, and the groups named with their counts. */
function TierSummary({ points }: { points: TreePoint[] }) {
  const counts = countByTierGroup(points)
  return (
    <div className={styles.tiers}>
      <div aria-hidden="true" className={styles.ribbon}>
        {TIER_GROUPS.map((group) => counts[group.key] > 0 ? (
          <span data-tone={group.tone} key={group.key} style={{ '--n': counts[group.key] } as CSSProperties} />
        ) : null)}
      </div>
      <ul aria-label="Mức nắm của các điểm" className={styles.legend}>
        {TIER_GROUPS.map((group) => (
          <li data-tone={group.tone} key={group.key} title={group.hint}>
            {group.label}{' '}
            <b>{counts[group.key]}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Wide screens: a chart for each skill shown, and under it the selected point with what it builds on and the way to practise it. */
function ChartView({ points, allPoints, skill, ...view }: ViewProps & { points: TreePoint[]; allPoints: TreePoint[]; skill: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const byId = useMemo(() => new Map(allPoints.map((point) => [point.knowledgePointId, point])), [allPoints])
  const dependents = useMemo(() => dependentsOf(allPoints), [allPoints])
  const order = useMemo(() => learningOrder(allPoints), [allPoints])
  const skills = orderedTreeSkills(points)
  // A point picked in another skill is not shown now, so the choice falls back to where the learner should start.
  const selected = points.find((point) => point.knowledgePointId === selectedId) ?? defaultSelection(points)

  function select(id: string) {
    setSelectedId(id)
    // The panel is under the chart; bring it into view when the pick left it off screen.
    document.getElementById('lp-point-detail')?.scrollIntoView?.({ block: 'nearest' })
  }

  return (
    <>
      <div className={styles.summary}>
        <p className={styles.summaryMeta}>{points.length} điểm kiến thức{skill === 'ALL' ? ' · tất cả kỹ năng' : ` · ${skillLabel(skill) ?? skill}`}</p>
        <TierSummary points={points} />
      </div>
      <div className={styles.charts}>
        {skills.map((key) => (
          <KnowledgeTreeChart
            key={key}
            note={skillLabel(key) ?? key}
            onSelect={select}
            points={points.filter((point) => pointSkill(point) === key)}
            selectedId={selected?.knowledgePointId ?? null}
            title={view.courseName}
          />
        ))}
      </div>
      {selected ? (
        <PointDetail
          backTo={view.backTo}
          courseId={view.courseId}
          dependents={dependents.get(selected.knowledgePointId) ?? []}
          depleted={view.depleted}
          key={selected.knowledgePointId}
          onCourseChanged={view.onCourseChanged}
          onHeartsChanged={view.onHeartsChanged}
          onSelect={select}
          point={selected}
          prerequisites={selected.prerequisiteIds.flatMap((id) => byId.get(id) ?? [])}
          step={order.get(selected.knowledgePointId)}
        />
      ) : null}
    </>
  )
}

/** Narrow screens: the course as a tree of skills, and each skill's points listed step by step, what comes first on top. */
function ListView({ points, allPoints, ...view }: ViewProps & { points: TreePoint[]; allPoints: TreePoint[] }) {
  const byId = new Map(allPoints.map((point) => [point.knowledgePointId, point]))
  const branches = orderedTreeSkills(points)

  return (
    <>
      <div className={styles.board} role="region" aria-label="Sơ đồ cây kiến thức">
        <div className={styles.tree}>
          <div className={styles.root}>
            <div className={styles.rootId}>
              <span className={styles.rootIcon}><Network aria-hidden="true" size={22} /></span>
              <div>
                <p className={styles.rootLabel}>Cây kiến thức</p>
                <p className={styles.rootName}>{view.courseName}</p>
                <p className={styles.rootMeta}>{branches.length} nhánh kỹ năng · {points.length} điểm kiến thức</p>
              </div>
            </div>
            <TierSummary points={points} />
          </div>

          <ul className={styles.branches} aria-label="Các nhánh kỹ năng">
            {branches.map((key) => {
              const branchPoints = points.filter((point) => pointSkill(point) === key)
              const steps = prerequisiteSteps(branchPoints)
              const SkillIcon = SKILL_ICONS[key] ?? Layers
              const mastered = branchPoints.filter((point) => point.tier === 'MAINTAIN').length
              return (
                <li className={styles.branch} key={key} style={{ '--hue': `var(--lp-hue-${key.toLowerCase()}, var(--lp-hue-other))` } as CSSProperties}>
                  <details className={styles.skillBranch} open>
                    <summary className={styles.branchHead}>
                      <span className={styles.skillIcon}><SkillIcon aria-hidden="true" size={20} /></span>
                      <h3 className={styles.branchCopy}>
                        <span>{skillLabel(key) ?? key}</span>
                        <small>{branchPoints.length} điểm · {mastered} vững</small>
                      </h3>
                      <ChevronDown aria-hidden="true" className={styles.chevron} size={17} />
                    </summary>
                    <ol className={styles.steps} aria-label={`Điểm kiến thức ${skillLabel(key) ?? key}`}>
                      {steps.map((step) => (
                        <li className={styles.step} key={step.number}>
                          {steps.length > 1 ? (
                            <p className={styles.stepHead}>
                              <span aria-hidden="true" className={styles.stepNode}>{step.number}</span>
                              {step.number === 1 ? 'Bước 1 · Nền tảng' : `Bước ${step.number}`}
                            </p>
                          ) : null}
                          <ul className={styles.stepPoints}>
                            {step.points.map((point) => (
                              <PointRow
                                backTo={view.backTo}
                                courseId={view.courseId}
                                depleted={view.depleted}
                                key={point.knowledgePointId}
                                onHeartsChanged={view.onHeartsChanged}
                                onCourseChanged={view.onCourseChanged}
                                point={point}
                                prerequisites={prerequisiteNames(point, byId)}
                              />
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ol>
                  </details>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <p className={styles.treeHint}>Mỗi nhánh đi từ nền tảng lên các điểm khó hơn: điểm ở bước sau xây trên điểm ở bước trước. Chạm vào một điểm để xem mô tả và lỗi hay gặp.</p>
    </>
  )
}

/** One knowledge point as a compact row. The row opens in place into what the learner needs to decide to practise it. */
function PointRow({ point, prerequisites, backTo, courseId, depleted, onHeartsChanged, onCourseChanged }: {
  point: TreePoint
  prerequisites: string[]
  backTo: string
  courseId: string
  depleted: boolean
  onHeartsChanged: () => void
  onCourseChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const practice = usePointPractice(point, { backTo, depleted, onHeartsChanged })
  const group = tierGroup(point)
  const TierIcon = TIER_ICON[group]
  const tier = tierMeta(point.tier)
  const percent = masteryPercent(point.mastery)
  const traps = point.errorTraps ?? []
  const panelId = `${point.knowledgePointId}-detail`
  const noteId = `${point.knowledgePointId}-note`
  const exhausted = !point.locked && !point.practiceAvailable
  const status = point.locked
    ? 'Cần mở khóa kỹ năng'
    : exhausted ? 'Hết bộ luyện tự do' : point.evidenceCount > 0 ? `${point.evidenceCount} lượt làm` : null

  return (
    <li className={styles.point} data-group={group} data-tier={point.tier ?? 'UNTOUCHED'} data-locked={point.locked ? 'true' : undefined}>
      <div className={styles.row}>
        <span aria-hidden="true" className={styles.tierMark}><TierIcon size={15} strokeWidth={2.6} /></span>
        <div className={styles.rowMain}>
          <h4 className={styles.name}>
            <button aria-controls={panelId} aria-expanded={open} className={styles.toggle} onClick={() => setOpen((value) => !value)} type="button">
              {point.name}
              <ChevronDown aria-hidden="true" className={styles.chev} size={14} />
            </button>
          </h4>
          {/* What comes first stays on the row: the order of learning is the point of the tree. */}
          {prerequisites.length > 0 ? (
            <p className={styles.needs}>
              <CornerLeftUp aria-hidden="true" size={12} />
              Xây trên: {prerequisites.join(', ')}
            </p>
          ) : null}
          <p className={styles.meta}>
            <span className="lp-sr-only">{tier.label}.</span>
            {point.topic && point.topic.position > 0 ? <span className={styles.origin}>{chapterLabel(point.topic.position)}</span> : null}
            <span className={styles.code}>{point.code}</span>
            {point.cefrLevel ? <span className={styles.cefr}>{point.cefrLevel}</span> : null}
            {status ? <span>{status}</span> : null}
            {traps.length > 0 ? <span className={styles.warn}>{traps.length} lỗi hay gặp</span> : null}
          </p>
          <div className={styles.gauge}>
            {percent !== null ? (
              <>
                <meter aria-label={`Mức nắm ${percent}%`} max={1} min={0} value={point.mastery ?? 0} />
                <span aria-hidden="true">{percent}%</span>
              </>
            ) : <span aria-hidden="true" className={styles.track} />}
          </div>
        </div>
        <div className={styles.action}>
          <PracticeButton className={styles.act} describedBy={noteId} point={point} practice={practice} />
        </div>
      </div>

      <div className={styles.detail} hidden={!open} id={panelId}>
        {point.canDo ? <p className={styles.canDo}>{point.canDo}</p> : null}
        <p className={styles.facts}>
          <span className={`lp-chip lp-chip--${tier.chip}`}>{tier.label}</span>
          <span>{tier.hint}</span>
        </p>
        <p className={styles.facts} id={noteId}>
          <span>{practiceNote(point, depleted)}</span>
          {point.nextReviewAt ? <span>Ôn lại: {new Date(point.nextReviewAt).toLocaleDateString('vi-VN')}</span> : null}
        </p>
        <PointLessons courseId={courseId} point={point} />
        {traps.length > 0 ? (
          <ul aria-label="Lỗi hay gặp" className={styles.traps}>
            {traps.map((trap) => {
              const trapTier = tierMeta(trap.tier)
              return (
                <li key={trap.knowledgePointId}>
                  <span className={styles.trapName}>{trap.name}</span>
                  <span className={`lp-chip lp-chip--${trapTier.chip}`} title={trapTier.hint}>{trapTier.label}</span>
                  <span>{masteryPercent(trap.mastery)}% · {trap.evidenceCount} lượt làm</span>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      <PracticeFeedback className={styles.failure} courseId={courseId} onCourseChanged={onCourseChanged} point={point} practice={practice} />
    </li>
  )
}

