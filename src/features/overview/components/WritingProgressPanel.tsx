import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { learningApi, toApiError, userMessage } from '@/features/learning-path/api'
import { freePracticePath, type FreePracticeNavigationState } from '@/features/learning-path/lib/routes'
import {
  writingProgressApi,
  type WritingFixedError,
  type WritingProgressPoint,
  type WritingRecurringError,
  type WritingTaskKey,
  type WritingTaskProgress,
} from '../api/writingProgressApi'
import { useStatisticsResource } from '../hooks/useStatisticsResource'
import { chartPoints, errorShare, linePath, shownErrors, TREND_MIN_ESSAYS } from '../writingProgressModel'
import { StatisticsCard } from './StatisticsCard'
import '../writing-progress.css'

const TASKS: Array<[WritingTaskKey, string]> = [['TASK_2', 'Task 2'], ['TASK_1', 'Task 1']]
const SOURCE_LABELS: Record<string, string> = { LESSON: 'Bài học', PRACTICE: 'Luyện thi', FREE: 'Tự luyện' }
const CHART_WIDTH = 320
const CHART_HEIGHT = 140
const BACK_TO = '/overview?tab=detailed-stats'

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('vi-VN')
const bandText = (band: number) => band.toFixed(1)
const emptyTask = (task: WritingTaskKey): WritingTaskProgress => ({
  task, points: [], recurringErrors: [], fixedErrors: [], insufficient: true,
})

/** Writing progress over the learner's first graded essays; the data comes from one request per task. */
export function WritingProgressPanel() {
  const [task, setTask] = useState<WritingTaskKey>('TASK_2')
  const progress = useStatisticsResource(`writing-progress:${task}`, (signal) => writingProgressApi.get(task, signal))
  const block = progress.data === null ? null : progress.data.tasks.find((item) => item.task === task) ?? emptyTask(task)
  return <StatisticsCard title="Tiến bộ Writing" subtitle="Các bài Writing đã chấm, tính theo lần nộp đầu của từng bài"
    resource={{ ...progress, data: block }} className="writing-progress-card" controls={
      <div role="group" aria-label="Chọn task Writing" className="writing-progress-tasks">
        {TASKS.map(([key, label]) => <Button key={key} variant="ghost" aria-pressed={task === key} onClick={() => setTask(key)}>{label}</Button>)}
      </div>
    }>
    {(data) => <WritingProgressBody data={data} />}
  </StatisticsCard>
}

function WritingProgressBody({ data }: { data: WritingTaskProgress }) {
  if (data.points.length === 0) {
    return <p className="writing-progress-empty">Chưa có bài Writing nào được chấm. Bài đã chấm sẽ hiện ở đây.</p>
  }
  return <div className="writing-progress-body">
    {data.insufficient
      ? <p role="status" className="writing-progress-note">Cần thêm {TREND_MIN_ESSAYS - data.points.length} bài để thấy xu hướng và lỗi đã khắc phục.</p>
      : <TrendChart points={data.points} />}
    <ScoreList points={data.points} />
    <RecurringErrors errors={data.recurringErrors} />
    <FixedErrors errors={data.fixedErrors} />
  </div>
}

function TrendChart({ points }: { points: WritingProgressPoint[] }) {
  const chart = chartPoints(points, CHART_WIDTH, CHART_HEIGHT)
  const first = points[0]
  const latest = points[points.length - 1]
  return <figure className="writing-progress-chart">
    <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img"
      aria-label={`Band tổng ước tính qua ${points.length} bài, bài gần nhất ${bandText(latest.overallBand)}`}>
      <line className="writing-progress-axis" x1={0} x2={CHART_WIDTH} y1={CHART_HEIGHT} y2={CHART_HEIGHT} />
      <path className="writing-progress-line" d={linePath(chart)} fill="none" />
      {chart.map((point, index) => <g key={index}>
        {point.promptChanged && <line className="writing-progress-prompt-change" x1={point.x} x2={point.x} y1={0} y2={CHART_HEIGHT}>
          <title>Đổi phiên bản chấm</title>
        </line>}
        <circle className="writing-progress-dot" cx={point.x} cy={point.y} r={4} />
      </g>)}
    </svg>
    <figcaption className="statistics-muted">
      Band tổng ước tính, từ {dateLabel(first.gradedAt)} đến {dateLabel(latest.gradedAt)}. Nét đứt: đổi phiên bản chấm.
    </figcaption>
  </figure>
}

function ScoreList({ points }: { points: WritingProgressPoint[] }) {
  return <section aria-label="Điểm từng bài">
    <h3 className="writing-progress-heading">Điểm từng bài</h3>
    <ul className="writing-progress-scores">
      {points.map((point) => <li key={point.submissionId}>
        <span>{dateLabel(point.gradedAt)} · {SOURCE_LABELS[point.source] ?? point.source}</span>
        <strong>{bandText(point.overallBand)}</strong>
        <span className="statistics-muted">
          {Object.entries(point.criteria).map(([code, band]) => `${code} ${bandText(band)}`).join(' · ')}
        </span>
      </li>)}
    </ul>
  </section>
}

function RecurringErrors({ errors }: { errors: WritingRecurringError[] }) {
  const shown = shownErrors(errors)
  return <section aria-label="Lỗi hay gặp">
    <h3 className="writing-progress-heading">Lỗi hay gặp</h3>
    {shown.length === 0
      ? <p className="statistics-muted">Chưa có lỗi nào lặp lại trong các bài này.</p>
      : <ol className="writing-progress-errors">
        {shown.map((error) => <li key={error.errorCode}>
          <div><strong>{error.errorName ?? error.errorCode}</strong> <span className="statistics-muted">{errorShare(error)}</span></div>
          {error.fixHint && <p>{error.fixHint}</p>}
          {error.practiceKnowledgePointId && <PracticeButton knowledgePointId={error.practiceKnowledgePointId}
            name={error.errorName ?? error.errorCode} code={error.errorCode} />}
        </li>)}
      </ol>}
  </section>
}

function FixedErrors({ errors }: { errors: WritingFixedError[] }) {
  if (errors.length === 0) return null
  return <section aria-label="Lỗi đã khắc phục">
    <h3 className="writing-progress-heading">Đã khắc phục</h3>
    <ul className="writing-progress-fixed">
      {errors.map((error) => <li key={error.errorCode}>
        <strong>{error.errorName ?? error.errorCode}</strong>
        <span className="statistics-muted"> không lặp lại ở {error.cleanEssaysSince} bài gần nhất</span>
      </li>)}
    </ul>
    <p className="statistics-muted">Chỉ là tín hiệu từ các bài đã chấm, không phải đánh giá mức thành thạo.</p>
  </section>
}

/** Starts free practice on the error's knowledge point, the same way the learning path does. */
function PracticeButton({ knowledgePointId, name, code }: { knowledgePointId: string; name: string; code: string }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  async function practise() {
    setStarting(true)
    setFailure(null)
    try {
      const attempt = await learningApi.startFreePractice(knowledgePointId)
      navigate(freePracticePath(attempt.attemptId), {
        state: { freePractice: { pointName: name, pointCode: code, backTo: BACK_TO } } satisfies FreePracticeNavigationState,
      })
    } catch (reason) {
      setFailure(userMessage(toApiError(reason)))
      setStarting(false)
    }
  }
  return <div className="writing-progress-practice">
    <Button variant="outline" disabled={starting} onClick={practise}>{starting ? 'Đang mở…' : 'Luyện lỗi này'}</Button>
    {failure && <p role="alert">{failure}</p>}
  </div>
}
