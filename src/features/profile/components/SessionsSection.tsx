import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Monitor } from 'lucide-react'
import type { ProfileSession } from '../api/profileApi'
import { useSessions } from '../hooks/useSessions'
import { errorMessage } from '../lib/errorMessage'

interface SessionsSectionProps {
  onShowToast: (message: string, tone?: 'success' | 'error' | 'info') => void
}

const UNKNOWN_DEVICE = 'Thiết bị không xác định'

function formatTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN')
}

function SessionRow({ session, onRevoke, busy }: {
  session: ProfileSession
  onRevoke: (sessionId: string) => void
  busy: boolean
}) {
  const lastUsed = formatTime(session.lastUsedAt) || formatTime(session.startedAt)
  return (
    <li className="profile-oauth-item">
      <div className="profile-oauth-brand">
        <Monitor size={18} aria-hidden="true" className="profile-subcard-icon" />
        <div>
          <strong className="profile-oauth-name">{session.userAgent || UNKNOWN_DEVICE}</strong>
          <span className="profile-oauth-status">
            {[session.ipAddress, lastUsed && `Hoạt động gần nhất: ${lastUsed}`].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
      {session.current ? (
        <span className="profile-oauth-status">Thiết bị này</span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onRevoke(session.sessionId)}
          className="profile-unlink-btn"
        >
          Đăng xuất thiết bị
        </Button>
      )}
    </li>
  )
}

/** Devices signed in to the account, each one can be ended from here. */
export function SessionsSection({ onShowToast }: SessionsSectionProps) {
  const { sessions, status, revoke, revokeOthers } = useSessions()
  const [busy, setBusy] = useState(false)
  const [confirmingOthers, setConfirmingOthers] = useState(false)

  const others = sessions.filter((session) => !session.current)

  async function run(action: () => Promise<void>, successMessage: string) {
    setBusy(true)
    try {
      await action()
      onShowToast(successMessage, 'success')
    } catch (error) {
      onShowToast(errorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function confirmRevokeOthers() {
    setConfirmingOthers(false)
    await run(() => revokeOthers(), 'Đã đăng xuất các thiết bị khác.')
  }

  return (
    <section className="profile-section-card" aria-labelledby="sessions-title">
      <div className="profile-section-header">
        <div className="profile-section-title-wrap">
          <Monitor className="profile-section-icon" aria-hidden="true" size={20} />
          <div>
            <h2 id="sessions-title" className="profile-section-title">Thiết bị đăng nhập</h2>
            <p className="profile-section-subtitle">Các thiết bị đang đăng nhập vào tài khoản của bạn</p>
          </div>
        </div>
        {others.length > 0 && (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirmingOthers(true)}>
            Đăng xuất các thiết bị khác
          </Button>
        )}
      </div>

      {status === 'loading' && <p role="status">Đang tải danh sách thiết bị…</p>}
      {status === 'error' && <p role="alert">Không tải được danh sách thiết bị. Vui lòng thử lại sau.</p>}
      {status === 'ready' && (
        <ul className="profile-oauth-list">
          {sessions.map((session) => (
            <SessionRow
              key={session.sessionId}
              session={session}
              busy={busy}
              onRevoke={(sessionId) => void run(() => revoke(sessionId), 'Đã đăng xuất thiết bị.')}
            />
          ))}
        </ul>
      )}

      {confirmingOthers && (
        <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sessions-confirm-title">
          <div className="profile-confirm-card">
            <h3 id="sessions-confirm-title" className="profile-confirm-title">Đăng xuất {others.length} thiết bị khác?</h3>
            <p className="profile-confirm-desc">
              Các thiết bị này sẽ phải đăng nhập lại. Thiết bị đang dùng sẽ không bị ảnh hưởng.
            </p>
            <div className="profile-confirm-actions">
              <Button type="button" variant="ghost" onClick={() => setConfirmingOthers(false)} disabled={busy}>Hủy</Button>
              <Button type="button" variant="destructive" onClick={() => void confirmRevokeOthers()} disabled={busy}>
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
