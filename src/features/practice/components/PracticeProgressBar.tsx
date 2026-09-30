import { getProgressMetrics } from '../lib/progressMetrics'

interface PracticeProgressBarProps {
  completed: number
  total: number
}

export function PracticeProgressBar({ completed, total }: PracticeProgressBarProps) {
  const metrics = getProgressMetrics(completed, total)
  const progressLabel = `${metrics.completed}/${metrics.total} câu · ${metrics.percentage}%`

  return (
    <section className="practice-progress" aria-label="Tiến độ làm bài">
      <div className="practice-progress-copy">
        <span>Tiến độ</span>
        <strong>{progressLabel}</strong>
      </div>
      <progress
        className="practice-progress-bar"
        value={metrics.percentage}
        max={100}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={metrics.percentage}
        aria-valuetext={`Đã làm ${metrics.completed} trên ${metrics.total} câu, ${metrics.percentage}%`}
      >
        {metrics.percentage}%
      </progress>
    </section>
  )
}
