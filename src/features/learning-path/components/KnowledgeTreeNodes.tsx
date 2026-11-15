import { memo } from 'react'
import { getBezierPath, Handle, Position, type EdgeProps, type NodeProps } from '@xyflow/react'
import { Link } from 'react-router-dom'
import { ArrowRight, Lightbulb, Lock, ShieldAlert, ShieldCheck, ShieldOff } from 'lucide-react'
import { holdsBack, kindOf, useBlockingReview } from '../lib/blockingReviews'
import { skillLabel } from '../lib/courseMeta'
import { reviewPath } from '../lib/masteryGuide'
import { TIER_ICON } from '../lib/tierIcon'
import { chapterLabel, masteryPercent, pointSkill, tierGroup, tierMeta } from '../lib/treeMeta'
import {
  useTreeFocus,
  type ContextFlowNode,
  type HeadingFlowNode,
  type LinkFlowEdge,
  type PointFlowNode,
  type ReviewFlowNode,
} from '../lib/treeFlow'
import { FreeBadge } from './FreeBadge'
import styles from './KnowledgeTreeChart.module.css'

/**
 * Lines meet a box at its edges. The handles that React Flow needs to know where that is are invisible and carry no
 * behaviour: nothing is connected or dragged by hand, the lines come from the prerequisites.
 */
function Ends() {
  return (
    <>
      <Handle className={styles.handle} isConnectable={false} position={Position.Left} type="target" />
      <Handle className={styles.handle} isConnectable={false} position={Position.Right} type="source" />
    </>
  )
}

/**
 * A point of the skill: a button that selects it (the click is caught by the chart as React Flow reports it, so Enter and
 * Space select too). The tier colours its left edge and an icon repeats it, so it never rests on colour alone.
 */
export const PointNode = memo(function PointNode({ data }: NodeProps<PointFlowNode>) {
  const { point, column } = data
  const { selectedId, related, focus } = useTreeFocus()
  const group = tierGroup(point)
  const tier = tierMeta(point.tier)
  const TierIcon = point.locked ? Lock : TIER_ICON[group]
  const percent = masteryPercent(point.mastery)
  // Only a review that still holds the learner back marks the box; a finished or suggested one is shown by its own node.
  const review = holdsBack(useBlockingReview(point.knowledgePointId))
  return (
    <>
      <Ends />
      <button
        aria-controls="lp-point-detail"
        aria-pressed={point.knowledgePointId === selectedId}
        className={styles.box}
        data-group={group}
        data-locked={point.locked ? 'true' : undefined}
        data-related={related.has(point.knowledgePointId) ? 'true' : undefined}
        data-review={review ? 'true' : undefined}
        onBlur={() => focus(null)}
        onFocus={() => focus(point.knowledgePointId)}
        type="button"
      >
        <span className={styles.head}>
          <span className={styles.origin}>{point.topic && point.topic.position > 0 ? chapterLabel(point.topic.position) : point.code}</span>
          <span className={styles.badges}>
            {point.freePreview ? <FreeBadge /> : null}
            {point.cefrLevel ? <span className={styles.cefr}>{point.cefrLevel}</span> : null}
            <TierIcon aria-hidden="true" className={styles.tierIcon} size={14} strokeWidth={2.6} />
          </span>
        </span>
        <span className={styles.name} title={point.name}>{point.name}</span>
        <span aria-hidden="true" className={styles.gauge}>
          <span className={styles.track}><span style={{ inlineSize: `${percent ?? 0}%` }} /></span>
          <span>{percent === null ? '—' : `${percent}%`}</span>
        </span>
        <span className="lp-sr-only">
          {tier.label}. Học thứ {column + 1}.{percent !== null ? ` Mức nắm ${percent}%.` : ''}{review ? ' Có bài ôn đang chặn tiến độ.' : ''}
        </span>
      </button>
    </>
  )
})

/** A point of another skill or of a lower course that the chart builds on: named and placed, but quiet and not selectable. */
export const ContextNode = memo(function ContextNode({ data }: NodeProps<ContextFlowNode>) {
  const { point, column } = data
  const { related } = useTreeFocus()
  // A diagnosis can send the learner back to a point of another skill or a lower course; the review node drawn after it says so,
  // and the red edge here ties the two.
  const review = holdsBack(useBlockingReview(point.knowledgePointId))
  return (
    <>
      <Ends />
      <div
        aria-label={`Điểm nền: ${point.name}${review ? ', có bài ôn đang chặn tiến độ' : ''}`}
        className={styles.context}
        data-related={related.has(point.knowledgePointId) ? 'true' : undefined}
        data-review={review ? 'true' : undefined}
        role="group"
      >
        <span className={styles.origin}>
          {point.reference ? point.reference.courseName : skillLabel(pointSkill(point)) ?? pointSkill(point)} · {point.topic && point.topic.position > 0 ? chapterLabel(point.topic.position) : point.code}
        </span>
        <span className={styles.name} title={point.name}>{point.name}</span>
        <span className="lp-sr-only">Nền, học thứ {column + 1}.</span>
      </div>
    </>
  )
})

/** What a review node says of its state, in words and with an icon, so the state never rests on colour alone. */
const REVIEW_STATE = {
  PENDING: { tag: 'Bài ôn · chặn tiến độ', Icon: ShieldAlert, go: 'Làm bài ôn', summary: 'đang chặn tiến độ' },
  SUGGESTED: { tag: 'Bài ôn · gợi ý', Icon: Lightbulb, go: 'Làm bài ôn', summary: 'gợi ý, không bắt buộc' },
  DONE: { tag: 'Bài ôn · đã hoàn thành', Icon: ShieldCheck, go: 'Xem lại', summary: 'đã hoàn thành' },
  SKIPPED: { tag: 'Bài ôn · đã bỏ qua', Icon: ShieldOff, go: 'Xem lại', summary: 'đã bỏ qua' },
} as const

/**
 * A review of the point before it, drawn after that point. A blocking one is kept there once it is done; one the system only
 * suggested hangs off the point as a branch, since nothing waits for it. It is picked like a point (its panel says the rest), and
 * the link under its name is the way into the review. Red while it holds the learner back, orange when it is only suggested, green
 * when it is done, grey when it was skipped.
 */
export const ReviewNode = memo(function ReviewNode({ id, data }: NodeProps<ReviewFlowNode>) {
  const { review, point } = data
  const { selectedId, focus } = useTreeFocus()
  const kind = kindOf(review)
  const state = REVIEW_STATE[kind]
  return (
    <>
      <Ends />
      <div className={styles.reviewBox} data-state={kind}>
        <button
          aria-controls="lp-point-detail"
          aria-label={`Bài ôn ${state.summary}: ${point.name}`}
          aria-pressed={id === selectedId}
          className={styles.reviewPick}
          onBlur={() => focus(null)}
          onFocus={() => focus(id)}
          type="button"
        >
          <span className={styles.reviewTag}>
            <state.Icon aria-hidden="true" size={13} strokeWidth={2.6} />
            {state.tag}
          </span>
          <span className={styles.name} title={point.name}>Ôn: {point.name}</span>
        </button>
        <Link aria-label={`${state.go}: ${point.name}`} className={styles.reviewGo} to={reviewPath(review.reviewId)}>
          {state.go}
          <ArrowRight aria-hidden="true" size={14} />
        </Link>
      </div>
    </>
  )
})

/** The name of a step, above its column. */
export const HeadingNode = memo(function HeadingNode({ data }: NodeProps<HeadingFlowNode>) {
  if (data.review) {
    return (
      <p className={`${styles.columnName} ${styles.columnReview}`}>
        <span aria-hidden="true"><ShieldAlert size={12} strokeWidth={2.6} /></span>
        Bài ôn
      </p>
    )
  }
  return (
    <p className={`${styles.columnName}${data.context ? ` ${styles.columnContext}` : ''}`}>
      <span aria-hidden="true">{data.number}</span>
      {data.context ? 'Điểm nền' : data.number === 1 ? 'Nền tảng' : `Bước ${data.number}`}
    </p>
  )
})

/** A line from the point that is needed to the point that builds on it, with an arrow at the end that needs it. */
export function LinkEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<LinkFlowEdge>) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, curvature: 0.4 })
  const state = data?.state ?? 'quiet'
  const lit = state === 'lit'
  // A line through a review reads apart from the order of learning: red and dashed while the review holds the learner back,
  // orange and dashed when it is only suggested, green once it is done, and quiet when it was skipped.
  const review = data?.review ?? null
  const kind = review === 'PENDING' ? 'review' : review === 'DONE' ? 'done' : review === 'SUGGESTED' ? 'suggested' : null
  const reviewClass = review === 'PENDING' ? styles.reviewLink
    : review === 'DONE' ? styles.doneLink
      : review === 'SUGGESTED' ? styles.suggestedLink : ''
  return (
    <path
      className={`${styles.link}${reviewClass ? ` ${reviewClass}` : ''}${lit ? ` ${styles.lit}` : state === 'faded' ? ` ${styles.faded}` : ''}`}
      d={path}
      markerEnd={`url(#${data?.markerId}-${kind ?? (lit ? 'lit' : 'quiet')})`}
    />
  )
}
