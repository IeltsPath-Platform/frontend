import { AlertTriangle, CheckCircle2, Clock, ListChecks, PenLine, type LucideIcon } from 'lucide-react'
import { AdminEmpty } from '@/features/admin/components/AdminState'
import { useAdminResource, type AdminResource } from '@/features/admin/lib/useAdminResource'
import { sourceLabel, taskLabel } from '@/features/admin/examiner-review/lib/reviewLabels'
import { useAuthSession } from '@/features/auth/authSession'
import { listMyCompletedReviews, listMyOpenGradingJobs } from '../../grading/api/examinerGradingApi'
import { GradeAction } from '../../grading/components/JobActions'
import { UNSUPPORTED_NOTE, canGradeHere } from '../../grading/lib/gradingLabels'
import { deadlineText, viewQueue } from '../../grading/lib/queueView'
import type { GradingEntry } from '../../grading/types'
import { ATTENTION_LIMIT, needsAttention, whyText, type AttentionReason } from '../lib/attention'
import { getExaminerSummary, getMyExaminerProfile } from '../api/examinerDashboardApi'
import { useLiveReload } from '../../lib/useLiveReload'
import { Block } from '../components/DashboardBlock'
import { QueueStats } from '../components/QueueStats'
import { ResultStats } from '../components/ResultStats'
import { DONE_PATH, QUEUE_PATH, RESULT_SAMPLE } from '../lib/dashboardLabels'
import '../../grading/examiner-grading.css'
import '../examiner-dashboard.css'

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
    <Block resource={open} title="Việc cần làm ngay" to={QUEUE_PATH} toLabel="Xem toàn bộ hàng đợi">
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
 * What an examiner opens first, laid out like the admin overview: the queue in numbers, what to do now, and what was graded so far.
 * There is no greeting bar; the page starts with the numbers. The whole list and the finished jobs are the queue.
 */
export function ExaminerDashboardPage() {
  const { userId } = useAuthSession()
  const summary = useAdminResource('examiner-dashboard|summary', (signal) => getExaminerSummary(signal))
  const open = useAdminResource('examiner-dashboard|open', (signal) => listMyOpenGradingJobs(signal))
  const profile = useAdminResource(`examiner-dashboard|profile|${userId ?? ''}`, (signal) => getMyExaminerProfile(userId ?? '', signal))
  // The moment of loading travels with the numbers, so the 7-day chart ends on the day they were read.
  const results = useAdminResource('examiner-dashboard|results', async (signal) => ({
    page: await listMyCompletedReviews(0, signal, RESULT_SAMPLE),
    loadedAt: new Date(),
  }))

  useLiveReload(() => { summary.refresh(); open.refresh(); profile.refresh(); results.refresh() })

  return (
    <section className="adm-content ex-page">
      <h1 className="adm-sr-only">Tổng quan chấm bài</h1>
      <div className="ex-dashboard">
        <Block resource={summary} title="Hàng đợi" to={QUEUE_PATH} toLabel="Mở hàng đợi">
          {(data) => <QueueStats accepting={profile.data?.acceptingSubmissions ?? null} summary={data} />}
        </Block>

        <Todo open={open} />

        <Block resource={results} title="Kết quả chấm" to={DONE_PATH} toLabel="Xem các bài đã chấm">
          {({ page, loadedAt }) => <ResultStats items={page.content} loadedAt={loadedAt} total={page.totalElements} />}
        </Block>
      </div>
    </section>
  )
}
