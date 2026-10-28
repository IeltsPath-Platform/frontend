import { useState } from 'react'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { AdminModal } from '../../components/AdminLayer'
import { useAdminResource } from '../../lib/useAdminResource'
import { listLoginHistory } from '../api/loginHistoryApi'
import { deviceLabel, loginResultLabel } from '../lib/loginHistoryLabels'
import type { User } from '../types'
import '../users.css'
import '../user-security.css'

const PAGE_SIZE = 20

function LoginHistoryTable({ userId }: { userId: string }) {
  const [page, setPage] = useState(0)
  const history = useAdminResource(`login-history:${userId}:${page}`, (signal) => listLoginHistory(userId, page, PAGE_SIZE, signal))

  if (history.status === 'loading') return <AdminLoading label="Đang tải lịch sử đăng nhập…" />
  if (history.status === 'error' || !history.data) {
    return <AdminError message={history.error ?? 'Không tải được lịch sử đăng nhập.'} onRetry={history.reload} />
  }

  const { items, total } = history.data
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="um-history">
      <div className="adm-table-wrap">
        <table className="adm-table">
          <caption className="adm-sr-only">Lịch sử đăng nhập</caption>
          <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Thời gian</th><th scope="col">Kết quả</th><th scope="col">Địa chỉ IP</th><th scope="col">Thiết bị</th></tr></thead>
          <tbody>{items.length === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={5}>Chưa có lượt đăng nhập nào.</td></tr> : items.map((attempt, index) => (
            <tr key={attempt.id}>
              <td className="adm-stt">{page * PAGE_SIZE + index + 1}</td>
              <td>
                <div className="um-history-time">
                  <strong>{new Date(attempt.createdAt).toLocaleTimeString('vi-VN')}</strong>
                  <span className="adm-muted">{new Date(attempt.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </td>
              <td><span className={`adm-badge ${attempt.success ? 'adm-badge--ok' : 'adm-badge--danger'}`}>{loginResultLabel(attempt)}</span></td>
              <td className="um-history-ip">{attempt.ipAddress || '—'}</td>
              <td title={attempt.userAgent ?? undefined}>{deviceLabel(attempt.userAgent)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {total > 0 ? (
        <nav aria-label="Phân trang lịch sử đăng nhập" className="um-pager">
          <button className="adm-btn adm-btn--small" disabled={page === 0} onClick={() => setPage(page - 1)} type="button">Trang trước</button>
          <span>Trang {page + 1} / {pageCount} · {total} lượt</span>
          <button className="adm-btn adm-btn--small" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)} type="button">Trang sau</button>
        </nav>
      ) : null}
    </div>
  )
}

export function LoginHistoryModal({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <AdminModal title="Lịch sử đăng nhập" description={user.fullName ? `${user.fullName} · ${user.email}` : user.email} onClose={onClose}>
      {() => <LoginHistoryTable userId={user.id} />}
    </AdminModal>
  )
}
