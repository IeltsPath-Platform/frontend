import type { TreePoint } from '~types/learningPath'
import { skillLabel } from '../lib/courseMeta'
import { TIER_ICON } from '../lib/tierIcon'
import { chapterLabel, masteryPercent, pointSkill, tierGroup, tierMeta } from '../lib/treeMeta'
import { practiceNote, usePointPractice } from '../lib/usePointPractice'
import { PointLessons } from './PointLessons'
import { PracticeButton, PracticeFeedback } from './PointPractice'
import styles from './PointDetail.module.css'

/**
 * A point that comes before or after the selected one, as a button that selects it, with the chặng that teaches it. When
 * the order of the chặng contradicts the order of the points (something the selected point builds on is taught in a
 * later chặng) the tag is marked, so the learner is not left wondering why the tree and the course disagree.
 */
function RelatedPoint({ other, from, direction, onSelect }: {
  other: TreePoint
  from: TreePoint
  direction: 'before' | 'after'
  onSelect: (id: string) => void
}) {
  const sameSkill = pointSkill(other) === pointSkill(from)
  const position = other.topic?.position ?? 0
  const ownPosition = from.topic?.position ?? 0
  const outOfOrder = sameSkill && position > 0 && ownPosition > 0
    && (direction === 'before' ? position > ownPosition : position < ownPosition)
  const tag = position > 0 ? `${sameSkill ? '' : `${skillLabel(pointSkill(other)) ?? pointSkill(other)} · `}${chapterLabel(position)}` : null
  return (
    <li>
      <button onClick={() => onSelect(other.knowledgePointId)} type="button">
        {other.name}
        {tag ? (
          <small
            data-out-of-order={outOfOrder ? 'true' : undefined}
            title={outOfOrder ? (direction === 'before' ? 'Điểm này được dạy ở chặng sau điểm đang chọn.' : 'Điểm này được dạy ở chặng trước điểm đang chọn.') : undefined}
          >
            {tag}
          </small>
        ) : null}
      </button>
    </li>
  )
}

/**
 * Everything about the point selected in the chart, and the way to practise it. What it builds on and what builds on it
 * are buttons that move the selection, so the order of learning can be followed from here as well as by the lines.
 * Keyed by point in the page, so a failure from one point is not shown under the next.
 */
export function PointDetail({ point, step, prerequisites, dependents, onSelect, backTo, courseId, depleted, onHeartsChanged, onCourseChanged }: {
  point: TreePoint
  /** The order the point is learnt in within its skill; 1 is first. */
  step: number | undefined
  prerequisites: TreePoint[]
  dependents: TreePoint[]
  onSelect: (id: string) => void
  backTo: string
  courseId: string
  depleted: boolean
  onHeartsChanged: () => void
  onCourseChanged: () => void
}) {
  const practice = usePointPractice(point, { backTo, depleted, onHeartsChanged })
  const group = tierGroup(point)
  const TierIcon = TIER_ICON[group]
  const tier = tierMeta(point.tier)
  const percent = masteryPercent(point.mastery)
  const traps = point.errorTraps ?? []
  const noteId = `${point.knowledgePointId}-note`
  const skill = skillLabel(pointSkill(point)) ?? pointSkill(point)

  return (
    <aside aria-label="Chi tiết điểm kiến thức" className={styles.detail} data-group={group} id="lp-point-detail">
      <div className={styles.summaryColumn}>
      <header className={styles.head}>
        <span aria-hidden="true" className={styles.mark}><TierIcon size={18} strokeWidth={2.6} /></span>
        <div className={styles.title}>
          <p className={styles.kicker}>{skill}{step ? ` · Học thứ ${step}` : ''}</p>
          <h3>{point.name}</h3>
          <p className={styles.code}>
            <span>{point.code}</span>
            {point.cefrLevel ? <span className={styles.cefr}>{point.cefrLevel}</span> : null}
          </p>
        </div>
      </header>

      <div className={styles.status}>
        <span className={`lp-chip lp-chip--${tier.chip}`}>{tier.label}</span>
        <span>{tier.hint}</span>
      </div>

      <div className={styles.gauge}>
        {percent !== null ? <meter aria-label={`Mức nắm ${percent}%`} max={1} min={0} value={point.mastery ?? 0} /> : <span aria-hidden="true" className={styles.empty} />}
        <span>{percent === null ? 'Chưa có mức nắm' : `Mức nắm ${percent}%`}</span>
      </div>

      {point.canDo ? <p className={styles.canDo}>{point.canDo}</p> : null}
      <PointLessons courseId={courseId} point={point} />
      </div>

      <div className={styles.actionColumn}>
      <section aria-labelledby={`${point.knowledgePointId}-before`} className={styles.links}>
        <h4 id={`${point.knowledgePointId}-before`}>Xây trên (học trước)</h4>
        {prerequisites.length > 0
          ? <ul>{prerequisites.map((other) => <RelatedPoint direction="before" from={point} key={other.knowledgePointId} onSelect={onSelect} other={other} />)}</ul>
          : <p>Điểm nền tảng, không cần học gì trước.</p>}
      </section>
      <section aria-labelledby={`${point.knowledgePointId}-after`} className={styles.links}>
        <h4 id={`${point.knowledgePointId}-after`}>Mở ra (học sau)</h4>
        {dependents.length > 0
          ? <ul>{dependents.map((other) => <RelatedPoint direction="after" from={point} key={other.knowledgePointId} onSelect={onSelect} other={other} />)}</ul>
          : <p>Chưa có điểm nào xây trên điểm này.</p>}
      </section>

      {traps.length > 0 ? (
        <section aria-labelledby={`${point.knowledgePointId}-traps`} className={styles.traps}>
          <h4 id={`${point.knowledgePointId}-traps`}>Lỗi hay gặp</h4>
          <ul aria-label="Lỗi hay gặp">
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
        </section>
      ) : null}

      <div className={styles.action}>
        <PracticeButton className={styles.act} describedBy={noteId} point={point} practice={practice} />
        <p className={styles.note} id={noteId}>
          <span>{practiceNote(point, depleted)}</span>
          {point.nextReviewAt ? <span>Ôn lại: {new Date(point.nextReviewAt).toLocaleDateString('vi-VN')}</span> : null}
        </p>
      </div>
      <PracticeFeedback courseId={courseId} onCourseChanged={onCourseChanged} point={point} practice={practice} />
      </div>
    </aside>
  )
}
