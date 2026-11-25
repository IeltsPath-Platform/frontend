import { AdminError, AdminLoading } from '../../components/AdminState'
import { AdminModal } from '../../components/AdminLayer'
import { InfiniteCount, InfiniteSentinel } from '../../components/InfiniteSentinel'
import { useInfiniteList } from '../../lib/useInfiniteList'
import { listLoginHistory } from '../api/loginHistoryApi'
import { deviceLabel, loginResultLabel } from '../lib/loginHistoryLabels'
import type { User } from '../types'
import '../users.css'
import '../user-security.css'

const PAGE_SIZE = 20

function LoginHistoryTable({ userId }: { userId: string }) {
  const history = useInfiniteList(`login-history:${userId}`, async (page, signal) => {
    const result = await listLoginHistory(userId, page, PAGE_SIZE, signal)
    return { content: result.items, page, totalElements: result.total, totalPages: Math.ceil(result.total / PAGE_SIZE) }
  })

  if (history.status === 'loading' && history.items.length === 0) return <AdminLoading label="Đang tải lịch sử đăng nhập…" />
  if (history.status === 'error') return <AdminError message={history.error ?? 'Không tải được lịch sử đăng nhập.'} onRetry={history.reload} />
  const items = history.items

  return (
    <div className="um-history">
      <InfiniteCount items={items.length} noun="lượt" total={history.total} />
      <div className="adm-table-wrap">
        <table className="adm-table adm-table--sticky">
          <caption className="adm-sr-only">Lịch sử đăng nhập</caption>
          <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Thời gian</th><th scope="col">Kết quả</th><th scope="col">Địa chỉ IP</th><th scope="col">Thiết bị</th></tr></thead>
          <tbody>{items.length === 0 && history.status === 'success' ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={5}>Chưa có lượt đăng nhập nào.</td></tr> : items.map((attempt, index) => (
            <tr key={attempt.id}>
              <td className="adm-stt">{index + 1}</td>
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
          ))}<tr><td colSpan={5}><InfiniteSentinel as="div" hasMore={history.hasMore} itemCount={items.length} loadingMore={history.loadingMore} moreError={history.moreError} noun="lượt" onReachEnd={history.loadMore} onRetry={history.retryMore} resetKey={userId} /></td></tr></tbody>
        </table>
      </div>
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
