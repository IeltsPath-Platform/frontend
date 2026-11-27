import { useState } from 'react'
import { AdminEmpty, AdminError, AdminLoading } from '@/features/admin/components/AdminState'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { AdminPage } from '@/features/admin/pages/AdminPage'
import {
  aiGradingReportApi,
  type AiGradingReportStatus,
  type AiGradingSubmissionType,
} from '@/features/practice/ai-grading-report/aiGradingReportApi'

const PAGE_SIZE = 20
/** Reports older than this still open have missed the review target. */
const REVIEW_TARGET_HOURS = 24

const STATUS_LABEL: Record<AiGradingReportStatus, string> = { OPEN: 'Chờ xem', REVIEWED: 'Đã xem', DISMISSED: 'Bỏ qua' }
const TYPE_LABEL: Record<AiGradingSubmissionType, string> = { WRITING: 'Writing', SPEAKING: 'Speaking' }

function ageHours(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) / 3_600_000
}

/** Learners' reports that an AI grade looked wrong, for examiners to follow up. */
export function AiGradingReportsPage() {
  const [status, setStatus] = useState<AiGradingReportStatus | ''>('OPEN')
  const [type, setType] = useState<AiGradingSubmissionType | ''>('')
  const [page, setPage] = useState(0)
  const resource = useAdminResource(
    `ai-grading-reports:${status}:${type}:${page}`,
    () => aiGradingReportApi.list({ status: status || undefined, submissionType: type || undefined, page, size: PAGE_SIZE }),
  )
  const data = resource.data
  const rows = data?.content ?? []

  return (
    <AdminPage
      title="Báo cáo chấm AI"
      subtitle={`Học viên báo kết quả chấm AI có vấn đề. Mục tiêu xem trong ${REVIEW_TARGET_HOURS} giờ kể từ lúc gửi.`}
    >
      <div className="adm-filters">
        <label className="adm-field">
          <span>Trạng thái</span>
          <select className="adm-select" value={status} onChange={(event) => { setStatus(event.target.value as AiGradingReportStatus | ''); setPage(0) }}>
            <option value="">Tất cả</option>
            {(Object.keys(STATUS_LABEL) as AiGradingReportStatus[]).map((value) => <option key={value} value={value}>{STATUS_LABEL[value]}</option>)}
          </select>
        </label>
        <label className="adm-field">
          <span>Kỹ năng</span>
          <select className="adm-select" value={type} onChange={(event) => { setType(event.target.value as AiGradingSubmissionType | ''); setPage(0) }}>
            <option value="">Tất cả</option>
            <option value="WRITING">Writing</option>
            <option value="SPEAKING">Speaking</option>
          </select>
        </label>
      </div>

      {resource.status === 'loading' ? <AdminLoading label="Đang tải báo cáo…" /> : null}
      {resource.status === 'error' ? <AdminError message={resource.error!} onRetry={resource.reload} /> : null}
      {resource.status === 'success' && !rows.length ? (
        <AdminEmpty title="Không có báo cáo nào">Thử đổi bộ lọc trạng thái hoặc kỹ năng.</AdminEmpty>
      ) : null}

      {rows.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="adm-sr-only">Báo cáo kết quả chấm AI</caption>
            <thead>
              <tr>{['STT', 'Kỹ năng', 'Lý do', 'Trạng thái', 'Gửi lúc', 'Mã bài nộp'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((item, index) => {
                const overdue = item.status === 'OPEN' && ageHours(item.createdAt) > REVIEW_TARGET_HOURS
                return (
                  <tr key={item.id}>
                    <td className="adm-stt">{page * PAGE_SIZE + index + 1}</td>
                    <td>{TYPE_LABEL[item.submissionType]}</td>
                    <td className="whitespace-pre-line">{item.reason}</td>
                    <td>
                      <span className={`adm-badge ${item.status === 'OPEN' ? 'adm-badge--warn' : 'adm-badge--ok'}`}>{STATUS_LABEL[item.status]}</span>
                      {overdue ? <span className="adm-badge adm-badge--danger">Quá {REVIEW_TARGET_HOURS} giờ</span> : null}
                    </td>
                    <td>{new Date(item.createdAt).toLocaleString('vi-VN')}</td>
                    <td><code title={item.submissionId}>{item.submissionId.slice(0, 8)}</code></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {data && data.totalPages > 1 ? (
        <div className="adm-form-footer">
          <button className="adm-btn" type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Trang trước</button>
          <span className="adm-muted">Trang {page + 1}/{data.totalPages}</span>
          <button className="adm-btn" type="button" disabled={page + 1 >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Trang sau</button>
        </div>
      ) : null}
    </AdminPage>
  )
}
