import type { CSSProperties } from 'react'
import { Check, ClipboardCheck, Loader2, Lock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PracticeTestMilestone } from '~types/learningPath'

/**
 * A practice test on the course route, drawn right after the chặng it opens after. It is a checkpoint between chặng,
 * so it carries an icon instead of a chặng number and does not count as a chặng of the skill.
 */
export function PracticeTestStop({
  milestone,
  after,
  index,
  startingId,
  onStart,
}: {
  milestone: PracticeTestMilestone
  /** The chặng it opens after, already worded for the learner. */
  after: string
  /** Position in the list on screen; staggers the entrance. */
  index: number
  startingId: string | null
  onStart: (milestone: PracticeTestMilestone) => void
}) {
  const state = milestone.status === 'LOCKED' ? 'locked' : milestone.status === 'DONE' ? 'passed' : 'available'
  const starting = startingId === milestone.packageId

  return (
    <li
      className={`lp-stop lp-stop--${state}`}
      style={{ '--i': index, '--topic-progress': state === 'passed' ? 1 : 0 } as CSSProperties}
    >
      <span className="lp-stop__node" aria-hidden="true">
        {state === 'locked' ? <Lock size={15} /> : state === 'passed' ? <Check size={17} strokeWidth={2.75} /> : <ClipboardCheck size={17} />}
      </span>

      <div className={`lp-checkpoint lp-checkpoint--${state}`}>
        <div className="lp-checkpoint__text">
          <p className="lp-stop__kicker">Đề luyện theo mốc</p>
          <h3 className="lp-checkpoint__title">{milestone.title}</h3>
          {state === 'locked' ? (
            <p className="lp-checkpoint__meta lp-stop__lock">
              <Lock aria-hidden="true" size={14} />
              Mở sau {after}
            </p>
          ) : (
            <p className="lp-checkpoint__meta">
              {state === 'passed' ? 'Điểm lần làm đầu tiên.' : 'Điểm lần làm đầu tiên tính vào điểm quá trình của khóa.'}
            </p>
          )}
        </div>

        {state === 'locked' ? null : (
          <div className="lp-checkpoint__action">
            {milestone.status === 'DONE' && milestone.percent !== null ? (
              <span className="lp-chip lp-chip--success">{milestone.percent}%</span>
            ) : null}
            <Button
              className={state === 'available' ? 'lp-btn lp-btn--accent' : 'lp-btn'}
              disabled={startingId !== null}
              onClick={() => onStart(milestone)}
              type="button"
              variant={state === 'available' ? 'default' : 'outline'}
            >
              {starting ? <Loader2 aria-hidden="true" className="lp-spin" /> : state === 'passed' ? <RotateCcw aria-hidden="true" /> : null}
              {starting ? 'Đang giao đề…' : state === 'passed' ? 'Làm lại' : 'Làm đề'}
            </Button>
          </div>
        )}
      </div>
    </li>
  )
}
