import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { REVIEW_PAGE_SIZE, claimReview, listExaminerQuality, listMyReviews, listReviewQueue } from '../api/examinerReviewApi'
import { QUALITY_NOTE, byDifference, percentText, shortId, sourceLabel, taskLabel, waitText } from '../lib/reviewLabels'
import type { QueueEntry } from '../types'
import '../examiner-review.css'

type Tab = 'queue' | 'mine' | 'quality'
const TAB_LABEL: Record<Tab, string> = { queue: 'Bài chờ chấm lại', mine: 'Bài tôi đang chấm', quality: 'Chất lượng giám khảo' }

function QueueTable({ entries, action }: { entries: QueueEntry[]; action: (entry: QueueEntry) => ReactNode }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr><th>Task</th><th>Nguồn bài</th><th>Thời gian chờ</th><th /></tr></thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{taskLabel(entry.task)}</td>
              <td>{sourceLabel(entry)}</td>
              <td>{waitText(entry.waitSeconds)}{entry.overdue ? <> <span className="adm-badge adm-badge--danger">Quá 48 giờ</span></> : null}</td>
              <td>{action(entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  return (
    <nav className="adm-er-actions" aria-label="Phân trang">
      <button className="adm-btn" type="button" disabled={page === 0} onClick={() => onPage(page - 1)}>Trang trước</button>
      <span>Trang {page + 1}</span>
      <button className="adm-btn" type="button" disabled={(page + 1) * REVIEW_PAGE_SIZE >= total} onClick={() => onPage(page + 1)}>Trang sau</button>
    </nav>
  )
}

function Quality() {
  const quality = useAdminResource('examiner-quality', (signal) => listExaminerQuality(signal))
  if (quality.status === 'loading') return <AdminLoading />
  if (quality.status === 'error') return <AdminError message={quality.error!} onRetry={quality.reload} />
  const rows = byDifference(quality.data ?? [])
  if (rows.length === 0) return <AdminEmpty title="Chưa có bài nào được chấm lại" />
  return (
    <>
      <p className="adm-muted">{QUALITY_NOTE}</p>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>Giám khảo</th><th>Số bài đã chấm lại</th><th>Lệch trung bình (band)</th><th>Bài lệch hơn 1 band</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.examinerId}>
                <td>{row.examinerName || shortId(row.examinerId)}</td>
                <td>{row.reviewedEssays}</td>
                <td>{row.averageAbsoluteBandDifference.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                <td>{percentText(row.overOneBandRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Queue({ mine }: { mine: boolean }) {
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const list = useAdminResource(`examiner-review:${mine ? 'mine' : 'queue'}:${page}`, (signal) => (mine ? listMyReviews(page, signal) : listReviewQueue(page, signal)))

  async function claim(entry: QueueEntry) {
    if (busy) return
    setBusy(entry.id)
    setError(null)
    try {
      await claimReview(entry.id)
      navigate(`/content-author/examiner-review/${entry.id}`)
    } catch (reason) {
      setError(adminErrorMessage(reason))
      setBusy(null)
    }
  }

  if (list.status === 'loading') return <AdminLoading />
  if (list.status === 'error') return <AdminError message={list.error!} onRetry={list.reload} />
  const data = list.data!
  return (
    <>
      {error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}
      {data.content.length === 0 ? <AdminEmpty title={mine ? 'Bạn chưa nhận bài nào' : 'Chưa có bài chờ chấm lại'} /> : (
        <QueueTable
          entries={data.content}
          action={(entry) => mine
            ? <Link className="adm-btn" to={`/content-author/examiner-review/${entry.id}`}>Chấm tiếp</Link>
            : <button className="adm-btn adm-btn--primary" type="button" disabled={busy !== null} onClick={() => void claim(entry)}>Nhận</button>}
        />
      )}
      <Pager page={page} total={data.totalElements} onPage={setPage} />
    </>
  )
}

export function ExaminerReviewPage() {
  const [tab, setTab] = useState<Tab>('queue')
  return (
    <AdminPage title="Đánh giá giám khảo" subtitle="Chấm lại mù một số bài Writing đã được giám khảo chấm để biết ai đang lệch.">
      <div className="adm-er-workspace">
        <div className="adm-er-actions" role="group" aria-label="Chọn danh sách">
          {(Object.keys(TAB_LABEL) as Tab[]).map((key) => (
            <button className="adm-btn" key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{TAB_LABEL[key]}</button>
          ))}
        </div>
        {tab === 'quality' ? <Quality /> : <Queue key={tab} mine={tab === 'mine'} />}
      </div>
    </AdminPage>
  )
}
