import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PracticeErrorButton } from '@/features/practice/writing/PracticeErrorButton'
import { overviewApi, type WritingProgressPoint, type WritingProgressTask } from '../api/overviewApi'
import { useStatisticsResource } from '../hooks/useStatisticsResource'
import {
  CHART, CRITERION_LABEL, TASK_LABEL, criteriaOf, defaultTask, gradingChanges, layoutChart,
  type ChartSeries, type CriterionKey, type WritingTaskCode,
} from '../writingProgressModel'
import { StatisticsCard } from './StatisticsCard'

const SOURCE_LABEL: Record<WritingProgressPoint['source'], string> = { LESSON: 'Bài học', PRACTICE: 'Luyện tập', FREE: 'Viết tự do' }
const WRITING_CATALOG = '/practice-tests?skill=writing'
const RECURRING_SHOWN = 5

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('vi-VN')
const bandText = (band: number | undefined) => band === undefined ? '—' : band.toFixed(1)

/** Mục "Tiến bộ Writing": band qua các bài, lỗi hay gặp và lỗi đã khắc phục, dựng từ một request. */
export function WritingProgressPanel() {
  const resource = useStatisticsResource('writing-progress', (signal) => overviewApi.writingProgress(signal))
  const [chosen, setChosen] = useState<WritingTaskCode | null>(null)
  return (
    <StatisticsCard title="Tiến bộ Writing" subtitle="Band ước tính của lần nộp đầu tiên mỗi bài, qua các bài đã chấm" resource={resource} className="detailed-writing-progress">
      {(data) => {
        const total = data.tasks.reduce((sum, task) => sum + task.points.length, 0)
        if (total === 0) {
          return <div className="wp-empty">
            <p>Bạn chưa có bài Writing nào được chấm.</p>
            <Button asChild variant="outline"><Link to={WRITING_CATALOG}>Luyện Writing</Link></Button>
          </div>
        }
        const active = chosen ?? defaultTask(data.tasks)
        const task = data.tasks.find((item) => item.task === active)
        return <div className="wp-body">
          <div className="detailed-periods wp-tasks" role="group" aria-label="Chọn loại bài Writing">
            {data.tasks.map((item) => (
              <Button key={item.task} variant="ghost" aria-pressed={item.task === active} onClick={() => setChosen(item.task)}>
                {TASK_LABEL[item.task]} ({item.points.length})
              </Button>
            ))}
          </div>
          {task ? <TaskProgress key={task.task} task={task} /> : null}
        </div>
      }}
    </StatisticsCard>
  )
}

function TaskProgress({ task }: { task: WritingProgressTask }) {
  if (task.points.length === 0) {
    return <div className="wp-empty">
      <p>Chưa có bài {TASK_LABEL[task.task]} nào được chấm.</p>
      <Button asChild variant="outline"><Link to={WRITING_CATALOG}>Luyện Writing</Link></Button>
    </div>
  }
  return <>
    {task.insufficient
      ? <p className="wp-note" role="status">Mới có {task.points.length} bài {TASK_LABEL[task.task]}. Cần ít nhất 3 bài để thấy xu hướng band.</p>
      : <BandChart task={task.task} points={task.points} />}
    {task.insufficient && <ScoreTable task={task.task} points={task.points} open />}
    <RecurringErrors task={task} />
    <FixedErrors task={task} />
  </>
}

function BandChart({ task, points }: { task: WritingTaskCode; points: WritingProgressPoint[] }) {
  const keys = criteriaOf(task)
  const layout = layoutChart(points, keys)
  const changes = gradingChanges(points)
  const [active, setActive] = useState<number | null>(null)
  const readoutId = useId()
  const shown = points[active ?? points.length - 1]
  const first = points[0].overallBand
  const last = points[points.length - 1].overallBand
  const step = (CHART.width - CHART.left - CHART.right) / Math.max(points.length - 1, 1)
  return <div className="wp-chart">
    <p id={readoutId} className="wp-readout" aria-live="polite">
      <b>Bài {(active ?? points.length - 1) + 1}/{points.length}</b> · {dateLabel(shown.gradedAt)} · {SOURCE_LABEL[shown.source]} ·{' '}
      Tổng {bandText(shown.overallBand)} · {keys.map((key) => `${key} ${bandText(shown.criteria[key])}`).join(' · ')}
    </p>
    <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-describedby={readoutId}
      aria-label={`Band tổng qua ${points.length} bài ${TASK_LABEL[task]}, từ ${bandText(first)} đến ${bandText(last)}`}>
      {layout.yTicks.map((tick) => <g key={tick.value}>
        <line x1={CHART.left} x2={CHART.width - CHART.right} y1={tick.y} y2={tick.y} className="wp-grid" />
        <text x={CHART.left - 8} y={tick.y + 4} className="wp-axis" textAnchor="end">{tick.value}</text>
      </g>)}
      {changes.map((index) => <g key={index}>
        <line x1={layout.xs[index] - step / 2} x2={layout.xs[index] - step / 2} y1={CHART.top} y2={CHART.height - CHART.bottom} className="wp-change" />
        <text x={layout.xs[index] - step / 2 + 4} y={CHART.top + 10} className="wp-axis">Đổi cách chấm</text>
      </g>)}
      {layout.xs.map((x, index) => <text key={index} x={x} y={CHART.height - 8} className="wp-axis" textAnchor="middle">{index + 1}</text>)}
      {active !== null && <line x1={layout.xs[active]} x2={layout.xs[active]} y1={CHART.top} y2={CHART.height - CHART.bottom} className="wp-cursor" />}
      {layout.series.map((series) => <Series key={series.key} series={series} />)}
      {layout.xs.map((x, index) => (
        <rect key={index} x={x - Math.max(step, 24) / 2} y={CHART.top} width={Math.max(step, 24)} height={CHART.height - CHART.top - CHART.bottom}
          className="wp-hit" tabIndex={0} aria-label={`Bài ${index + 1}, ${dateLabel(points[index].gradedAt)}, tổng ${bandText(points[index].overallBand)}`}
          onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onMouseLeave={() => setActive(null)} onBlur={() => setActive(null)} />
      ))}
    </svg>
    <ul className="wp-legend" aria-label="Chú giải">
      <li><i className="wp-swatch wp-s0" aria-hidden="true" /> Band tổng</li>
      {keys.map((key, index) => <li key={key}><i className={`wp-swatch wp-s${index + 1}`} aria-hidden="true" /> {key} · {CRITERION_LABEL[key]}</li>)}
    </ul>
    <ScoreTable task={task} points={points} />
  </div>
}

/** Colour slot of each line: 0 is the overall band, 1–4 follow the criteria in the order of the legend. */
const CRITERION_SLOT: Record<CriterionKey, number> = { TA: 1, TR: 1, CC: 2, LR: 3, GRA: 4 }

function Series({ series }: { series: ChartSeries }) {
  const slot = series.key === 'OVERALL' ? 0 : CRITERION_SLOT[series.key]
  return <g className={`wp-series wp-s${slot}`}>
    {series.runs.map((run, i) => <polyline key={i} points={run} fill="none" className="wp-line" />)}
    {series.dots.map((dot) => <circle key={dot.index} cx={dot.x} cy={dot.y} r={series.key === 'OVERALL' ? 5 : 4} className="wp-dot" />)}
  </g>
}

/** The same numbers as text: the table view that stands in for colour, and what a screen reader reads. */
function ScoreTable({ task, points, open = false }: { task: WritingTaskCode; points: WritingProgressPoint[]; open?: boolean }) {
  const keys = criteriaOf(task)
  return <details className="wp-table" open={open}>
    <summary>Xem bảng số</summary>
    <table>
      <caption className="sr-only">Band từng bài {TASK_LABEL[task]}, bài cũ nhất ở trên</caption>
      <thead><tr><th scope="col">Bài</th><th scope="col">Ngày</th><th scope="col">Nguồn</th><th scope="col">Tổng</th>{keys.map((key) => <th scope="col" key={key}>{key}</th>)}</tr></thead>
      <tbody>{points.map((point, index) => <tr key={point.submissionId}>
        <th scope="row">{index + 1}</th><td>{dateLabel(point.gradedAt)}</td><td>{SOURCE_LABEL[point.source]}</td>
        <td>{bandText(point.overallBand)}</td>{keys.map((key) => <td key={key}>{bandText(point.criteria[key])}</td>)}
      </tr>)}</tbody>
    </table>
  </details>
}

function RecurringErrors({ task }: { task: WritingProgressTask }) {
  const errors = task.recurringErrors.slice(0, RECURRING_SHOWN)
  if (errors.length === 0) return null
  return <section className="wp-section" aria-label="Lỗi hay gặp">
    <h3>Lỗi hay gặp</h3>
    <ul>
      {errors.map((error) => <li key={error.errorCode}>
        <div>
          <b>{error.errorName ?? error.errorCode}</b>
          <span className="wp-count">{error.essaysWithError}/{error.essaysTotal} bài</span>
          {error.fixHint && <p>{error.fixHint}</p>}
        </div>
        <PracticeErrorButton knowledgePointId={error.practiceKnowledgePointId} name={error.errorName ?? error.errorCode} code={error.errorCode} />
      </li>)}
    </ul>
  </section>
}

function FixedErrors({ task }: { task: WritingProgressTask }) {
  if (task.fixedErrors.length === 0) return null
  return <section className="wp-section" aria-label="Lỗi đã khắc phục">
    <h3>Đã khắc phục</h3>
    <ul>
      {task.fixedErrors.map((error) => <li key={error.errorCode}>
        <div><b>{error.errorName ?? error.errorCode}</b><p>Không lặp lại ở {error.cleanEssaysSince} bài gần nhất.</p></div>
      </li>)}
    </ul>
  </section>
}
