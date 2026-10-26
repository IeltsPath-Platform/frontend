import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, ClipboardList, Clock, ListChecks, PenLine, UserRound, type LucideIcon } from 'lucide-react'
import { AdminEmpty, AdminError, AdminLoading } from '@/features/admin/components/AdminState'
import { useAdminResource, type AdminResource } from '@/features/admin/lib/useAdminResource'
import { AdminPage } from '@/features/admin/pages/AdminPage'
import { sourceLabel, taskLabel, waitText } from '@/features/admin/examiner-review/lib/reviewLabels'
import { useAuthSession } from '@/features/auth/authSession'
import { listMyCompletedReviews, listMyOpenGradingJobs } from '../../grading/api/examinerGradingApi'
import { GradeAction, ReviewAction } from '../../grading/components/JobActions'
import { UNSUPPORTED_NOTE, canGradeHere, isInProgress, remainingSeconds, statusBadge, timeOfDay } from '../../grading/lib/gradingLabels'
import { viewQueue } from '../../grading/lib/queueView'
import { getExaminerSummary, getMyExaminerProfile } from '../api/examinerDashboardApi'
import { useLiveReload } from '../../lib/useLiveReload'
import { intakeFull, intakePercent, intakeText } from '../lib/dashboardLabels'
import type { Summary } from '../types'
import '../../grading/examiner-grading.css'
import '../examiner-dashboard.css'

const QUEUE = '/admin/grading/writing'
const DONE = `${QUEUE}?tab=done`
const LIST_LIMIT = 5

/** One block of the page: its own loading and error state, so a failing source never blanks the rest. */
function Block<T>({ title, to, toLabel, resource, children }: {
  title: string
  to?: string
  toLabel?: string
  resource: AdminResource<T>
  children: (data: T) => ReactNode
}) {
  return (
    <section aria-label={title} className="adm-card ex-block">
      <header className="ex-block__head">
        <h2>{title}</h2>
        {to ? <Link className="adm-btn adm-btn--small ex-block__link" to={to}>{toLabel ?? 'Mở'}<ArrowRight aria-hidden="true" size={14} /></Link> : null}
      </header>
      {resource.status === 'loading' ? <AdminLoading label="Đang tải…" /> : null}
      {resource.status === 'error' ? <AdminError message={resource.error ?? 'Không tải được dữ liệu.'} onRetry={resource.reload} /> : null}
      {resource.status === 'success' && resource.data !== null ? children(resource.data) : null}
    </section>
  )
}

function Tile({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: 'blue' | 'indigo' | 'amber' | 'red' }) {
  return (
    <li>
      <Link className={`adm-card ex-tile ex-tile--${tone}${tone !== 'blue' && tone !== 'indigo' && value === 0 ? ' is-quiet' : ''}`} to={QUEUE}>
        <span aria-hidden="true" className="ex-tile__icon"><Icon size={22} /></span>
        <span className="ex-tile__body"><strong>{value}</strong><span>{label}</span></span>
        <ArrowRight aria-hidden="true" className="ex-tile__go" size={16} />
      </Link>
    </li>
  )
}

function Tiles({ summary }: { summary: Summary }) {
  return (
    <ul aria-label="Số bài theo trạng thái" className="ex-tiles">
      <Tile icon={ClipboardList} label="Chờ chấm" tone="blue" value={summary.queued} />
      <Tile icon={PenLine} label="Đang chấm" tone="indigo" value={summary.processing} />
      <Tile icon={Clock} label="Sắp quá hạn (36h)" tone="amber" value={summary.dueSoon} />
      <Tile icon={AlertTriangle} label="Quá hạn 48h" tone="red" value={summary.overdue} />
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
      {accepting === false ? <p className="ex-note ex-note--warn">Bạn đang tạm dừng nhận bài mới, học viên không chọn được bạn.</p> : null}
      <dl className="ex-facts ex-facts--boxes">
        <div><dt>Đã chấm hôm nay</dt><dd>{summary.completedToday}</dd></div>
        <div><dt>Đã chấm tuần này</dt><dd>{summary.completedThisWeek}</dd></div>
      </dl>
    </>
  )
}

/** The jobs whose 48 hours run out first, each with its button to grade. */
function Todo({ open }: { open: AdminResource<Awaited<ReturnType<typeof listMyOpenGradingJobs>>> }) {
  return (
    <Block resource={open} title="Việc cần làm" to={QUEUE} toLabel="Xem hàng đợi">
      {({ entries }) => {
        const writing = entries.filter((entry) => entry.skill === 'WRITING')
        const rows = viewQueue(writing, { tab: 'ALL', source: '', search: '', sort: 'DUE_FIRST' }).slice(0, LIST_LIMIT)
        if (rows.length === 0) return <AdminEmpty title="Chưa có bài nào chờ bạn chấm">Khi học viên chọn bạn chấm bài, bài sẽ xuất hiện ở đây.</AdminEmpty>
        return (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table ex-table">
                <thead><tr><th>Bài</th><th>Nguồn</th><th>Hạn chấm</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                <tbody>
                  {rows.map((entry) => {
                    const badge = statusBadge(entry)
                    return (
                      <tr key={entry.id}>
                        <td>Writing · {taskLabel(entry.task)}</td>
                        <td>{sourceLabel(entry)}</td>
                        <td>{entry.overdue ? 'Đã quá hạn' : `Còn ${waitText(remainingSeconds(entry.waitSeconds))}`}</td>
                        <td><span className={`adm-badge adm-badge--${badge.tone}`}>{badge.label}</span></td>
                        <td><GradeAction entry={entry} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {writing.length > rows.length ? <p className="adm-muted">Còn {writing.length - rows.length} bài nữa trong hàng đợi.</p> : null}
            {rows.some((entry) => !canGradeHere(entry)) ? <p className="adm-muted">{UNSUPPORTED_NOTE}</p> : null}
          </>
        )
      }}
    </Block>
  )
}

/** The jobs the examiner finished most recently, each with a button to read it again. */
function Recent({ done }: { done: AdminResource<Awaited<ReturnType<typeof listMyCompletedReviews>>> }) {
  return (
    <Block resource={done} title="Bài đã chấm gần đây" to={DONE} toLabel="Xem tất cả bài đã chấm">
      {(page) => {
        const rows = page.content.filter((item) => item.skill === 'WRITING')
        if (rows.length === 0) return <AdminEmpty title="Bạn chưa chấm bài nào">Bài bạn chấm xong sẽ nằm ở đây để xem lại.</AdminEmpty>
        return (
          <div className="adm-table-wrap">
            <table className="adm-table ex-table">
              <thead><tr><th>Bài</th><th>Nguồn</th><th>Band đã chấm</th><th>Chấm lúc</th><th>Thao tác</th></tr></thead>
              <tbody>
                {rows.map((item) => {
                  const date = item.completedAt ? new Date(item.completedAt) : null
                  const when = date && !Number.isNaN(date.getTime()) ? `${date.toLocaleDateString('vi-VN')} ${timeOfDay(item.completedAt!)}` : '—'
                  return (
                    <tr key={item.jobId}>
                      <td>Writing · {taskLabel(item.task)}</td>
                      <td>{sourceLabel({ attemptType: null, source: item.source })}</td>
                      <td><strong>{item.band.toFixed(1)}</strong></td>
                      <td>{when}</td>
                      <td><ReviewAction jobId={item.jobId} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }}
    </Block>
  )
}

/** What an examiner opens first: what to grade next, how much waits and is late, today's intake, and what was graded. */
export function ExaminerDashboardPage() {
  const { userId, userName } = useAuthSession()
  const summary = useAdminResource('examiner-dashboard|summary', (signal) => getExaminerSummary(signal))
  const open = useAdminResource('examiner-dashboard|open', (signal) => listMyOpenGradingJobs(signal))
  const done = useAdminResource('examiner-dashboard|done', (signal) => listMyCompletedReviews(0, signal, LIST_LIMIT))
  const profile = useAdminResource(`examiner-dashboard|profile|${userId ?? ''}`, (signal) => getMyExaminerProfile(userId ?? '', signal))

  useLiveReload(() => { summary.refresh(); open.refresh(); done.refresh(); profile.refresh() })
  // The job to grade next: the one closest to its deadline that can be graded here.
  const next = viewQueue((open.data?.entries ?? []).filter((entry) => entry.skill === 'WRITING' && canGradeHere(entry)),
    { tab: 'ALL', source: '', search: '', sort: 'DUE_FIRST' })[0]

  return (
    <AdminPage
      actions={(
        <>
          {next
            ? <Link className="adm-btn adm-btn--primary ex-cta" to={`${QUEUE}/${next.id}`}><PenLine aria-hidden="true" size={18} />{isInProgress(next) ? 'Tiếp tục chấm bài' : 'Chấm bài tiếp theo'}</Link>
            : <Link className="adm-btn adm-btn--primary ex-cta" to={QUEUE}><ListChecks aria-hidden="true" size={18} />Mở hàng đợi chấm bài</Link>}
          <Link className="adm-btn" to="/admin/examiner/profile"><UserRound aria-hidden="true" size={16} />Sửa hồ sơ</Link>
        </>
      )}
      subtitle="Việc của bạn hôm nay: bài chờ chấm, số bài đã nhận và đã chấm."
      title={`Xin chào ${userName}`}>
      <div className="ex-dashboard">
        {summary.status === 'success' && summary.data ? <Tiles summary={summary.data} /> : null}

        {/* The work list takes the wide column; today's intake is a slim card beside it, so it never pushes the work down. */}
        <div className="ex-main">
          <Todo open={open} />
          <aside className="ex-side">
            <Block resource={summary} title="Hôm nay">
              {(data) => <Today accepting={profile.data?.acceptingSubmissions ?? null} summary={data} />}
            </Block>
          </aside>
        </div>
        <Recent done={done} />
      </div>
    </AdminPage>
  )
}
