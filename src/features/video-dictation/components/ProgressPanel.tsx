import type { DictationSegment } from '../api/videoDictationApi'
import type { SegmentStat } from '../hooks/useDictationSession'
import { averageAccuracy, totalAttempts } from '../lib/dictationStats'

interface ProgressPanelProps {
  segments: DictationSegment[]
  stats: Record<string, SegmentStat>
  current: number
  passed: number
  onGoTo: (index: number) => void
}

/** One slim strip under the exercise: sentence bubbles on the left, the learner's numbers on the right. */
export function ProgressPanel({ segments, stats, current, passed, onGoTo }: ProgressPanelProps) {
  const total = segments.length
  const percent = total > 0 ? Math.round((passed / total) * 100) : 0
  const attempts = totalAttempts(stats)
  const average = averageAccuracy(segments, stats)

  return (
    <aside className="vdp-strip" aria-label="Tiến độ video">
      <div className="vdp-strip__progress">
        <strong>{passed} / {total} câu</strong>
        <div className="vd-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Tiến độ video">
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ol className="vdp-bubbles" title="Bấm vào một câu để làm câu đó">
        {segments.map((segment, position) => {
          const done = stats[segment.id]?.passed
          const isCurrent = position === current
          return (
            <li key={segment.id}>
              <button type="button" className="vdp-bubble" data-state={isCurrent ? 'current' : done ? 'done' : 'todo'}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Câu ${segment.sequenceNo}${done ? ', đã qua' : ', chưa qua'}${isCurrent ? ', đang làm' : ''}`}
                onClick={() => onGoTo(position)}>
                {segment.sequenceNo}
              </button>
            </li>
          )
        })}
      </ol>

      <dl className="vdp-stats">
        <div><dt>Chính xác TB</dt><dd>{average === null ? '—' : `${average}%`}</dd></div>
        <div><dt>Lần đã gõ</dt><dd>{attempts}</dd></div>
      </dl>
    </aside>
  )
}
