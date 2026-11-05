import { Link } from 'react-router-dom'
import { AlertTriangle, ClipboardList, Clock, PenLine, type LucideIcon } from 'lucide-react'
import { DonutChart } from '@/features/admin/overview/components/OverviewCharts'
import { formatCount } from '@/features/admin/overview/lib/overviewLabels'
import { QUEUE_PATH, heldBackByLateJobs, intakeFull, intakePercent, intakeText } from '../lib/dashboardLabels'
import { deadlineSlices, intakeSlices, openJobs } from '../lib/dashboardStats'
import type { Summary } from '../types'
import { Panel } from './DashboardBlock'

type Tone = 'info' | 'warn' | 'danger'

/** One state of the queue: its count, and the link that opens the matching tab. A late state with nothing in it turns calm. */
function StatusRow({ icon: Icon, label, count, tab, tone }: { icon: LucideIcon; label: string; count: number; tab: string; tone: Tone }) {
  const shown = tone !== 'info' && count === 0 ? 'ok' : tone
  return (
    <li className={`ov-check ex-check ex-check--${shown}`}>
      <Icon aria-hidden="true" size={16} />
      <Link to={`${QUEUE_PATH}?tab=${tab}`}>
        <strong>{count}</strong>
        <span>{label}</span>
      </Link>
    </li>
  )
}

/** The queue in four columns: what waits, how late it is, today's intake against the limit, and what was finished. */
export function QueueStats({ summary, accepting }: { summary: Summary; accepting: boolean | null }) {
  const open = openJobs(summary)
  const intake = intakeSlices(summary)
  return (
    <div className="ov-panels">
      <Panel title="Theo trạng thái">
        <ul aria-label="Số bài theo trạng thái" className="ov-checks">
          <StatusRow count={summary.queued} icon={ClipboardList} label="Chờ chấm" tab="queued" tone="info" />
          <StatusRow count={summary.processing} icon={PenLine} label="Đang chấm" tab="processing" tone="info" />
          <StatusRow count={summary.dueSoon} icon={Clock} label="Sắp quá hạn (36h)" tab="due-soon" tone="warn" />
          <StatusRow count={summary.overdue} icon={AlertTriangle} label="Quá hạn 48h" tab="overdue" tone="danger" />
        </ul>
      </Panel>

      <Panel title="Hạn chấm">
        {open > 0 ? (
          <DonutChart
            centerLabel="bài đang mở"
            centerValue={formatCount(open)}
            slices={deadlineSlices(summary)}
            summary={`${open} bài đang mở: ${deadlineSlices(summary).map((slice) => `${slice.label.toLowerCase()} ${slice.value}`).join(', ')}`}
          />
        ) : <p className="adm-muted ov-unknown">Không có bài đang mở.</p>}
      </Panel>

      <Panel title="Nhận bài hôm nay">
        <p className="ov-figure">{intakeText(summary)}</p>
        {intake ? (
          <DonutChart
            centerLabel={`${summary.receivedToday}/${summary.dailyLimit} bài`}
            centerValue={`${intakePercent(summary)}%`}
            slices={intake}
            summary={`Đã nhận ${summary.receivedToday} trên ${summary.dailyLimit} bài hôm nay`}
          />
        ) : null}
        {intakeFull(summary)
          ? <p className="ex-note ex-note--warn">Bạn đã nhận đủ số bài hôm nay. Học viên sẽ chọn được bạn lại từ ngày mai.</p>
          : null}
        {heldBackByLateJobs(summary)
          ? <p className="ex-note ex-note--warn">Bạn có {summary.overdue} bài quá hạn nên học viên tạm chưa chọn được bạn. Chấm bớt xuống dưới {summary.overdueLimit} bài quá hạn để nhận bài mới.</p>
          : null}
        {accepting === false ? <p className="ex-note ex-note--warn">Bạn đang tạm dừng nhận bài mới, học viên không chọn được bạn.</p> : null}
      </Panel>

      <Panel title="Đã chấm">
        <dl className="ex-figures">
          <div><dt>Đã chấm hôm nay</dt><dd>{summary.completedToday}</dd></div>
          <div><dt>Đã chấm tuần này</dt><dd>{summary.completedThisWeek}</dd></div>
        </dl>
      </Panel>
    </div>
  )
}
