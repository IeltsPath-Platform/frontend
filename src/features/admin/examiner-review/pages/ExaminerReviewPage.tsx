import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { InfiniteCount, InfiniteSentinel } from '../../components/InfiniteSentinel'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminResource } from '../../lib/useAdminResource'
import { useInfiniteList } from '../../lib/useInfiniteList'
import { AdminPage } from '../../pages/AdminPage'
import { REVIEW_PAGE_SIZE, claimReview, listExaminerQuality, listMyReviews, listReviewQueue } from '../api/examinerReviewApi'
import { QUALITY_NOTE, byDifference, percentText, shortId, sourceLabel, taskLabel, waitText } from '../lib/reviewLabels'
import type { QueueEntry } from '../types'
import '../examiner-review.css'
import { useAdminError } from '../../lib/useAdminError'

type Tab = 'queue' | 'mine' | 'quality'
const TAB_LABEL: Record<Tab, string> = { queue: 'Bài chờ chấm lại', mine: 'Bài tôi đang chấm', quality: 'Chất lượng giám khảo' }

function QueueTable({ entries, action, onEnd, hasMore, loadingMore, moreError, retry, resetKey }: { entries: QueueEntry[]; action: (entry: QueueEntry) => ReactNode; onEnd: () => void; hasMore: boolean; loadingMore: boolean; moreError: string | null; retry: () => void; resetKey: string }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr><th className="adm-stt" scope="col">STT</th><th>Task</th><th>Nguồn bài</th><th>Thời gian chờ</th><th /></tr></thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.id}>
              <td className="adm-stt">{index + 1}</td>
              <td>{taskLabel(entry.task)}</td>
              <td>{sourceLabel(entry)}</td>
              <td>{waitText(entry.waitSeconds)}{entry.overdue ? <> <span className="adm-badge adm-badge--danger">Quá 48 giờ</span></> : null}</td>
              <td>{action(entry)}</td>
            </tr>
          ))}
          <tr><td colSpan={5}><InfiniteSentinel as="div" hasMore={hasMore} itemCount={entries.length} loadingMore={loadingMore} moreError={moreError} noun="bài" onReachEnd={onEnd} onRetry={retry} resetKey={resetKey} /></td></tr>
        </tbody>
      </table>
    </div>
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
          <thead><tr><th className="adm-stt" scope="col">STT</th><th>Giám khảo</th><th>Số bài đã chấm lại</th><th>Lệch trung bình (band)</th><th>Bài lệch hơn 1 band</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.examinerId}>
                <td className="adm-stt">{index + 1}</td>
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
  const [busy, setBusy] = useState<string | null>(null)
  const [, setError] = useAdminError()
  const navigate = useNavigate()
  const key = `examiner-review:${mine ? 'mine' : 'queue'}`
  const list = useInfiniteList(key, async (page, signal) => {
    const result = mine ? await listMyReviews(page, signal) : await listReviewQueue(page, signal)
    return { content: result.content, page: result.page, totalElements: result.totalElements, totalPages: Math.ceil(result.totalElements / REVIEW_PAGE_SIZE) }
  })

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

  if (list.status === 'loading' && list.items.length === 0) return <AdminLoading />
  if (list.status === 'error') return <AdminError message={list.error!} onRetry={list.reload} />
  const entries = list.items
  return (
    <>
      {list.status === 'success' && entries.length === 0 ? <AdminEmpty title={mine ? 'Bạn chưa nhận bài nào' : 'Chưa có bài chờ chấm lại'} /> : entries.length > 0 ? <>
        <InfiniteCount items={entries.length} noun="bài" total={list.total} />
        <QueueTable
          entries={entries}
          hasMore={list.hasMore}
          loadingMore={list.loadingMore}
          moreError={list.moreError}
          onEnd={list.loadMore}
          retry={list.retryMore}
          resetKey={key}
          action={(entry) => mine
            ? <Link className="adm-btn" to={`/content-author/examiner-review/${entry.id}`}>Chấm tiếp</Link>
            : <button className="adm-btn adm-btn--primary" type="button" disabled={busy !== null} onClick={() => void claim(entry)}>Nhận</button>}
        />
      </> : null}
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
