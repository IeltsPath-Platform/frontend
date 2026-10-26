import { useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { AdminEmpty, AdminError, AdminLoading } from '@/features/admin/components/AdminState'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { AdminPage } from '@/features/admin/pages/AdminPage'
import { sourceLabel, taskLabel } from '@/features/admin/examiner-review/lib/reviewLabels'
import { getExaminerSummary } from '../../dashboard/api/examinerDashboardApi'
import { useLiveReload } from '../../lib/useLiveReload'
import { listMyCompletedReviews, listMyOpenGradingJobs } from '../api/examinerGradingApi'
import { GradeAction, ReviewAction } from '../components/JobActions'
import { UNSUPPORTED_NOTE, canGradeHere, isDueSoon, statusBadge, timeOfDay } from '../lib/gradingLabels'
import {
  QUEUE_PAGE_SIZE, countByTab, deadlineText, jobCode, pageCount, sourceKey, viewCompleted, viewQueue,
  type QueueSort, type QueueTab,
} from '../lib/queueView'
import type { CompletedItem, GradingEntry } from '../types'
import '../../dashboard/examiner-dashboard.css'
import '../examiner-grading.css'

/** The open jobs by state, and the ones the examiner already finished. */
type Tab = QueueTab | 'DONE'

const TABS: ReadonlyArray<{ key: Exclude<Tab, 'DONE'>; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'QUEUED', label: 'Chờ chấm' },
  { key: 'PROCESSING', label: 'Đang chấm' },
]

function Row({ entry }: { entry: GradingEntry }) {
  const badge = statusBadge(entry)
  return (
    <tr>
      <td><strong>{jobCode(entry.id)}</strong></td>
      <td>Writing · {taskLabel(entry.task)}</td>
      <td>Writing</td>
      <td><span className="adm-badge adm-badge--muted">{sourceLabel(entry)}</span></td>
      <td className={entry.overdue ? 'ex-overdue' : isDueSoon(entry) ? 'ex-due-soon' : undefined}>{deadlineText(entry)}</td>
      <td><span className={`adm-badge adm-badge--${badge.tone}`}>{badge.label}</span></td>
      <td><GradeAction entry={entry} /></td>
    </tr>
  )
}

function finishedText(iso: string | null | undefined) {
  const date = iso ? new Date(iso) : null
  return date && !Number.isNaN(date.getTime()) ? `${date.toLocaleDateString('vi-VN')} ${timeOfDay(iso!)}` : '—'
}

function DoneRow({ item }: { item: CompletedItem }) {
  return (
    <tr>
      <td><strong>{jobCode(item.jobId)}</strong></td>
      <td>Writing · {taskLabel(item.task)}</td>
      <td><span className="adm-badge adm-badge--muted">{sourceLabel({ attemptType: null, source: item.source })}</span></td>
      <td><strong>{item.band.toFixed(1)}</strong></td>
      <td>{finishedText(item.completedAt)}</td>
      <td><span className="adm-badge adm-badge--ok">Đã chấm</span></td>
      <td><ReviewAction jobId={item.jobId} /></td>
    </tr>
  )
}

/**
 * The Writing jobs learners chose this examiner for: a count of what is waiting, what is being graded, what is late and
 * how many were taken today, over a table the examiner can filter by state, source and code, and a tab of what they already
 * graded, to read again. The learner's name is not part of the data, so it cannot be shown.
 */
export function WritingQueuePage() {
  const location = useLocation()
  const [params] = useSearchParams()
  const completed = (location.state as { completed?: boolean } | null)?.completed === true
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'done' ? 'DONE' : 'ALL')
  const [source, setSource] = useState('')
  const [sort, setSort] = useState<QueueSort>('DUE_FIRST')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const summary = useAdminResource('grading-queue|summary', (signal) => getExaminerSummary(signal))
  const jobs = useAdminResource('grading-queue|jobs', (signal) => listMyOpenGradingJobs(signal))
  const done = useAdminResource('grading-queue|done', (signal) => listMyCompletedReviews(0, signal, 100))
  useLiveReload(() => { summary.refresh(); jobs.refresh(); done.refresh() })

  const writing = useMemo(() => (jobs.data?.entries ?? []).filter((entry) => entry.skill === 'WRITING'), [jobs.data])
  const finished = useMemo(() => (done.data?.content ?? []).filter((item) => item.skill === 'WRITING'), [done.data])
  const counts = countByTab(writing)
  const showingDone = tab === 'DONE'
  const sources = [...new Set(showingDone ? finished.map((item) => item.source ?? '') : writing.map(sourceKey))].sort()
  const openRows = showingDone ? [] : viewQueue(writing, { tab, source, search, sort })
  const doneRows = showingDone ? viewCompleted(finished, { source, search }) : []
  const total = showingDone ? doneRows.length : openRows.length
  const pages = pageCount(total)
  const from = page * QUEUE_PAGE_SIZE
  const list = showingDone ? done : jobs
  const hasAny = showingDone ? finished.length > 0 : writing.length > 0
  const limit = summary.data?.dailyLimit ?? null

  const refilter = (apply: () => void) => { apply(); setPage(0) }

  return (
    <AdminPage
      subtitle="Chỉ gồm các bài học viên đã chọn bạn chấm. Không có hàng đợi chung; bạn không thấy tên học viên."
      title="Hàng đợi chấm bài">
      <div className="adm-eg-workspace-list">
        {completed ? <p className="adm-alert" role="status">Đã hoàn tất chấm bài. Bài vừa chấm nằm ở tab "Đã chấm", bạn có thể xem lại bất cứ lúc nào.</p> : null}

        {summary.status === 'success' && summary.data ? (
          <ul aria-label="Số liệu hàng đợi" className="ex-stats ex-stats--four">
            <li className="adm-card ex-stat"><span>Chờ chấm</span><strong>{summary.data.queued}</strong></li>
            <li className="adm-card ex-stat"><span>Đang chấm</span><strong>{summary.data.processing}</strong></li>
            <li className={`adm-card ex-stat${summary.data.overdue > 0 ? ' ex-stat--danger' : ''}`}><span>Quá hạn 48 giờ</span><strong>{summary.data.overdue}</strong></li>
            <li className="adm-card ex-stat"><span>Đã nhận hôm nay{limit ? ' / tối đa' : ''}</span><strong>{limit ? `${summary.data.receivedToday} / ${limit}` : summary.data.receivedToday}</strong></li>
          </ul>
        ) : null}
        {summary.status === 'error'
          ? <p className="adm-muted">Không tải được số liệu. <button className="adm-btn adm-btn--small" onClick={summary.reload} type="button">Thử lại</button></p>
          : null}

        <div className="adm-eg-toolbar">
          <div aria-label="Chọn danh sách" className="adm-eg-actions" role="group">
            {TABS.map(({ key, label }) => (
              <button aria-pressed={tab === key} className="adm-btn" key={key} onClick={() => refilter(() => { setTab(key); setSource('') })} type="button">
                {label} ({counts[key]})
              </button>
            ))}
            <button aria-pressed={showingDone} className="adm-btn" onClick={() => refilter(() => { setTab('DONE'); setSource('') })} type="button">
              Đã chấm ({finished.length})
            </button>
          </div>
          <div className="adm-eg-actions">
            <label className="adm-eg-filter">
              <span className="adm-eg-filter__label">Nguồn</span>
              <select className="adm-select" onChange={(event) => refilter(() => setSource(event.target.value))} value={source}>
                <option value="">Tất cả</option>
                {sources.map((key) => <option key={key} value={key}>{sourceLabel({ attemptType: key, source: key })}</option>)}
              </select>
            </label>
            {showingDone ? null : (
              <label className="adm-eg-filter">
                <span className="adm-eg-filter__label">Hạn chấm</span>
                <select className="adm-select" onChange={(event) => refilter(() => setSort(event.target.value as QueueSort))} value={sort}>
                  <option value="DUE_FIRST">Gần nhất</option>
                  <option value="DUE_LAST">Xa nhất</option>
                </select>
              </label>
            )}
            <label className="adm-eg-filter adm-eg-search">
              <Search aria-hidden="true" size={16} />
              <input aria-label="Tìm theo mã bài" className="adm-input" onChange={(event) => refilter(() => setSearch(event.target.value))} placeholder="Mã bài" value={search} />
            </label>
          </div>
        </div>

        {list.status === 'loading' ? <AdminLoading /> : null}
        {list.status === 'error' ? <AdminError message={list.error!} onRetry={list.reload} /> : null}
        {list.status === 'success' && total === 0
          ? <AdminEmpty title={!hasAny
            ? (showingDone ? 'Bạn chưa chấm bài Writing nào' : 'Chưa có bài Writing nào chờ bạn chấm')
            : 'Không có bài nào khớp bộ lọc'}>
            {!hasAny
              ? (showingDone ? 'Bài bạn chấm xong sẽ nằm ở đây để xem lại.' : 'Khi học viên chọn bạn chấm bài, bài sẽ xuất hiện ở đây.')
              : 'Đổi tab, nguồn hoặc mã bài để xem các bài khác.'}
          </AdminEmpty>
          : null}
        {list.status === 'success' && total > 0 ? (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                {showingDone
                  ? <thead><tr><th>Mã bài</th><th>Bài</th><th>Nguồn</th><th>Band đã chấm</th><th>Chấm lúc</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                  : <thead><tr><th>Mã bài</th><th>Bài</th><th>Kỹ năng</th><th>Nguồn</th><th>Hạn chấm</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>}
                <tbody>
                  {showingDone
                    ? doneRows.slice(from, from + QUEUE_PAGE_SIZE).map((item) => <DoneRow item={item} key={item.jobId} />)
                    : openRows.slice(from, from + QUEUE_PAGE_SIZE).map((entry) => <Row entry={entry} key={entry.id} />)}
                </tbody>
              </table>
            </div>
            {!showingDone && openRows.slice(from, from + QUEUE_PAGE_SIZE).some((entry) => !canGradeHere(entry)) ? <p className="adm-muted">{UNSUPPORTED_NOTE}</p> : null}
          </>
        ) : null}
        {!showingDone && jobs.status === 'success' && jobs.data?.truncated
          ? <p className="adm-muted">Chỉ hiện 100 bài đầu của mỗi danh sách (chờ chấm, đang chấm).</p>
          : null}

        {list.status === 'success' && total > 0 ? (
          <nav aria-label="Phân trang" className="adm-eg-actions adm-eg-pager">
            <span>Hiển thị {Math.min(QUEUE_PAGE_SIZE, total - from)} / {total} · Trang {page + 1} / {pages}</span>
            <button className="adm-btn" disabled={page === 0} onClick={() => setPage(page - 1)} type="button">‹ Trước</button>
            <button className="adm-btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} type="button">Sau ›</button>
          </nav>
        ) : null}

        <p className="adm-muted adm-eg-note">
          Bài vào hàng đợi khi học viên chọn bạn. Hạn chấm là 48 giờ kể từ lúc được chọn; quá hạn, học viên được báo và có thể chuyển bài cho
          giám khảo khác (tối đa 2 lần), bài đó sẽ rời hàng đợi của bạn.
          {limit ? ` Mỗi ngày bạn nhận tối đa ${limit} bài mới, Writing và Speaking cộng lại; đủ ${limit} bài thì học viên không chọn được bạn nữa đến hết ngày.` : ''}
        </p>
      </div>
    </AdminPage>
  )
}
