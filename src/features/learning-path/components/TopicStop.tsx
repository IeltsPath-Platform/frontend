import { useState, type CSSProperties } from 'react'
import { Check, CheckCircle2, ChevronDown, Crown, Lock } from 'lucide-react'
import type { TopicSummary } from '~types/learningPath'
import { lockText } from '../lib/courseSkills'
import { topicStatusMeta } from '../lib/statusMeta'
import { SegmentMeter } from './SegmentMeter'
import { TopicLessonsPanel } from './TopicLessonsPanel'

/** One chặng of a skill on the course route: a card that expands in place into its lessons. */
export function TopicStop({
  topic,
  number,
  index,
  isNext,
  open,
  onToggle,
  quietReason = false,
}: {
  topic: TopicSummary
  /** Position inside its skill, counted from 1. */
  number: number
  /** Position in the list on screen; staggers the entrance. */
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
  // Lessons load the first time a card opens and stay mounted afterwards, so closing and reopening costs nothing.
  const [loaded, setLoaded] = useState(open)
  if (open && !loaded) setLoaded(true)

  const summary = (
    <>
      <div className="lp-stop__head">
        <p className="lp-stop__kicker">
          Chặng {String(number).padStart(2, '0')}
          {topic.totalLessons > 0 ? ` · ${topic.totalLessons} bài` : ''}
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
      className={`lp-stop lp-stop--${topic.status.toLowerCase()}${isNext ? ' is-next' : ''}${open ? ' is-open' : ''}`}
      style={{ '--i': index, '--topic-progress': progress } as CSSProperties}
    >
      <span className="lp-stop__node" aria-hidden="true">
        {locked ? <Lock size={15} /> : passed ? <Check size={17} strokeWidth={2.75} /> : number}
      </span>

      <div className="lp-stop__card">
        <div className="lp-stop__summary">
          <button
            aria-controls={panelId}
            aria-current={isNext ? 'step' : undefined}
            aria-describedby={locked ? reasonId : undefined}
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
    </li>
  )
}
