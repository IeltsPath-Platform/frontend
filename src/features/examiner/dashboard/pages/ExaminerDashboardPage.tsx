import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CalendarCheck, CheckCircle2, ClipboardList, Clock, Flame, ListChecks, PenLine, type LucideIcon } from 'lucide-react'
import { AdminEmpty, AdminError, AdminLoading } from '@/features/admin/components/AdminState'
import { useAdminResource, type AdminResource } from '@/features/admin/lib/useAdminResource'
import { sourceLabel, taskLabel } from '@/features/admin/examiner-review/lib/reviewLabels'
import { useAuthSession } from '@/features/auth/authSession'
import { listMyOpenGradingJobs } from '../../grading/api/examinerGradingApi'
import { GradeAction } from '../../grading/components/JobActions'
import { UNSUPPORTED_NOTE, canGradeHere } from '../../grading/lib/gradingLabels'
import { deadlineText, viewQueue } from '../../grading/lib/queueView'
import type { GradingEntry } from '../../grading/types'
import { ATTENTION_LIMIT, needsAttention, whyText, type AttentionReason } from '../lib/attention'
import { getExaminerSummary, getMyExaminerProfile } from '../api/examinerDashboardApi'
import { useLiveReload } from '../../lib/useLiveReload'
import { heldBackByLateJobs, intakeFull, intakePercent, intakeText } from '../lib/dashboardLabels'
import type { Summary } from '../types'
import '../../grading/examiner-grading.css'
import '../examiner-dashboard.css'

const QUEUE = '/admin/grading/writing'
const DONE = `${QUEUE}?tab=done`

type Tone = 'blue' | 'indigo' | 'amber' | 'red'

/** One block of the page: its own loading and error state, so a failing source never blanks the rest. */
function Block<T>({ title, icon: Icon, hot, tone, to, toLabel, resource, children }: {
  title: string
  icon: LucideIcon
  /** Orange-red icon chip, for the block that asks for action. */
  hot?: boolean
  tone: 'blue' | 'violet'
  to?: string
  toLabel?: string
  resource: AdminResource<T>
  children: (data: T) => ReactNode
}) {
  return (
    <section aria-label={title} className={`adm-card ex-block ex-block--${tone}`}>
      <header className="ex-block__head">
        <h2><span aria-hidden="true" className={`ex-block__icon${hot ? ' ex-block__icon--fire' : ''}`}><Icon size={18} /></span>{title}</h2>
        {to ? <Link className="adm-btn adm-btn--small ex-block__link" to={to}>{toLabel ?? 'Mở'}<ArrowRight aria-hidden="true" size={14} /></Link> : null}
      </header>
      {resource.status === 'loading' ? <AdminLoading label="Đang tải…" /> : null}
      {resource.status === 'error' ? <AdminError message={resource.error ?? 'Không tải được dữ liệu.'} onRetry={resource.reload} /> : null}
      {resource.status === 'success' && resource.data !== null ? children(resource.data) : null}
    </section>
  )
}

function Tile({ icon: Icon, label, value, tone, to }: { icon: LucideIcon; label: string; value: number; tone: Tone; to: string }) {
  return (
    <li>
      <Link className={`ex-tile ex-tile--${tone}${tone !== 'blue' && tone !== 'indigo' && value === 0 ? ' is-quiet' : ''}`} to={to}>
        <span aria-hidden="true" className="ex-tile__icon"><Icon size={24} /></span>
        <span className="ex-tile__body"><strong>{value}</strong><span>{label}</span></span>
        <ArrowRight aria-hidden="true" className="ex-tile__go" size={18} />
      </Link>
    </li>
  )
}

function Tiles({ summary }: { summary: Summary }) {
  return (
    <ul aria-label="Số bài theo trạng thái" className="ex-tiles">
      <Tile icon={ClipboardList} label="Chờ chấm" to={`${QUEUE}?tab=queued`} tone="blue" value={summary.queued} />
      <Tile icon={PenLine} label="Đang chấm" to={`${QUEUE}?tab=processing`} tone="indigo" value={summary.processing} />
      <Tile icon={Clock} label="Sắp quá hạn (36h)" to={`${QUEUE}?tab=due-soon`} tone="amber" value={summary.dueSoon} />
      <Tile icon={AlertTriangle} label="Quá hạn 48h" to={`${QUEUE}?tab=overdue`} tone="red" value={summary.overdue} />
    </ul>
  )
}

function Today({ summary, accepting }: { summary: Summary; accepting: boolean | null }) {
  const percent = intakePercent(summary)
  return (
    <>
      <p className="ex-intake">{intakeText(summary)}</p>
      {percent !== null ? (
        <div aria-label="Số bài đã nhận hôm nay" aria-valuemax={100} aria-valuemin={0} aria-valuenow={percent} className="ex-bar" role="progressbar">
          <span className={intakeFull(summary) ? 'ex-bar__fill ex-bar__fill--full' : 'ex-bar__fill'} style={{ width: `${percent}%` }} />
        </div>
      ) : null}
      {intakeFull(summary)
        ? <p className="ex-note ex-note--warn">Bạn đã nhận đủ số bài hôm nay. Học viên sẽ chọn được bạn lại từ ngày mai.</p>
        : null}
      {heldBackByLateJobs(summary)
        ? <p className="ex-note ex-note--warn">Bạn có {summary.overdue} bài quá hạn nên học viên tạm chưa chọn được bạn. Chấm bớt xuống dưới {summary.overdueLimit} bài quá hạn để nhận bài mới.</p>
        : null}
      {accepting === false ? <p className="ex-note ex-note--warn">Bạn đang tạm dừng nhận bài mới, học viên không chọn được bạn.</p> : null}
      <dl className="ex-facts ex-facts--boxes">
        <div className="ex-fact ex-fact--today"><dt>Đã chấm hôm nay</dt><dd>{summary.completedToday}</dd></div>
        <div className="ex-fact ex-fact--week"><dt>Đã chấm tuần này</dt><dd>{summary.completedThisWeek}</dd></div>
      </dl>
      <div className="ex-today__links">
        <Link className="ex-today__link" to={DONE}>Xem các bài đã chấm<ArrowRight aria-hidden="true" size={14} /></Link>
      </div>
    </>
  )
}

const REASON_ICON: Record<AttentionReason, LucideIcon> = { OVERDUE: AlertTriangle, DUE_SOON: Clock, IN_PROGRESS: PenLine }
const REASON_LABEL: Record<AttentionReason, string> = { OVERDUE: 'Quá hạn', DUE_SOON: 'Sắp quá hạn', IN_PROGRESS: 'Đang chấm dở' }

/** One job, as a card: what it is, why it is here, and the button to open it. */
function JobCard({ entry, reason }: { entry: GradingEntry; reason: AttentionReason | null }) {
  const Icon = reason ? REASON_ICON[reason] : ListChecks
  return (
    <li className={`ex-attn${reason ? ` ex-attn--${reason.toLowerCase().replace('_', '-')}` : ''}`}>
      <span aria-hidden="true" className="ex-attn__icon"><Icon size={20} /></span>
      <div className="ex-attn__body">
        <p className="ex-attn__title">
          <strong>Writing · {taskLabel(entry.task)}</strong>
          <span className="adm-badge adm-badge--muted">{sourceLabel(entry)}</span>
          {reason ? <span className={`ex-attn__tag ex-attn__tag--${reason.toLowerCase().replace('_', '-')}`}>{REASON_LABEL[reason]}</span> : null}
        </p>
        <p className="ex-attn__why">{reason ? whyText({ entry, reason }) : `Chờ chấm · ${deadlineText(entry).toLowerCase()}.`}</p>
      </div>
      <GradeAction entry={entry} />
    </li>
  )
}

/**
 * What to do now, not the whole queue: the few jobs that cannot wait (late, late soon, started and left). With none of those it
 * offers the next job instead. The full list, with filters and search, is the queue.
 */
function Todo({ open }: { open: AdminResource<Awaited<ReturnType<typeof listMyOpenGradingJobs>>> }) {
  return (
    <Block hot icon={Flame} resource={open} title="Việc cần làm ngay" to={QUEUE} toLabel="Xem toàn bộ hàng đợi" tone="blue">
      {({ entries }) => {
        const writing = entries.filter((entry) => entry.skill === 'WRITING')
        const urgent = needsAttention(writing).slice(0, ATTENTION_LIMIT)
        const next = urgent.length === 0 ? viewQueue(writing.filter(canGradeHere), { tab: 'ALL', source: '', search: '', sort: 'DUE_FIRST' })[0] : undefined
        if (writing.length === 0) return <AdminEmpty title="Chưa có bài nào chờ bạn chấm">Khi học viên chọn bạn chấm bài, bài sẽ xuất hiện ở đây.</AdminEmpty>
        const shown = urgent.length > 0 ? urgent.length : 1
        const rest = writing.length - shown
        return (
          <>
            {urgent.length > 0
              ? <ul className="ex-attn-list">{urgent.map(({ entry, reason }) => <JobCard entry={entry} key={entry.id} reason={reason} />)}</ul>
              : (
                <>
                  <p className="ex-attn-calm"><CheckCircle2 aria-hidden="true" size={18} />Không có bài nào gấp. Bài tiếp theo bạn có thể chấm:</p>
                  {next ? <ul className="ex-attn-list"><JobCard entry={next} reason={null} /></ul> : null}
                </>
              )}
            {rest > 0 ? <p className="ex-rest">Còn {rest} bài khác trong hàng đợi.</p> : null}
            {writing.some((entry) => !canGradeHere(entry)) ? <p className="adm-muted">{UNSUPPORTED_NOTE}</p> : null}
          </>
        )
      }}
    </Block>
  )
}

/**
 * What an examiner opens first: how much waits and is late, what to do now, and today's intake. There is no greeting bar; the
 * page starts with the numbers. The whole list and what was graded are the queue.
 */
export function ExaminerDashboardPage() {
  const { userId } = useAuthSession()
  const summary = useAdminResource('examiner-dashboard|summary', (signal) => getExaminerSummary(signal))
  const open = useAdminResource('examiner-dashboard|open', (signal) => listMyOpenGradingJobs(signal))
  const profile = useAdminResource(`examiner-dashboard|profile|${userId ?? ''}`, (signal) => getMyExaminerProfile(userId ?? '', signal))

  useLiveReload(() => { summary.refresh(); open.refresh(); profile.refresh() })

  return (
    <section className="adm-content ex-page">
      <h1 className="adm-sr-only">Tổng quan chấm bài</h1>
      <div className="ex-dashboard">
        {summary.status === 'success' && summary.data ? <Tiles summary={summary.data} /> : null}

        {/* The work list and today's intake side by side, the same height. What was graded is one click away from the intake card. */}
        <div className="ex-main">
          <Todo open={open} />
          <aside className="ex-side">
            <Block icon={CalendarCheck} resource={summary} title="Hôm nay" tone="violet">
              {(data) => <Today accepting={profile.data?.acceptingSubmissions ?? null} summary={data} />}
            </Block>
          </aside>
        </div>
      </div>
    </section>
  )
}
