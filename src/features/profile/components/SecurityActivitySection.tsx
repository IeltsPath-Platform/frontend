import { History } from 'lucide-react'
import { useSecurityEvents } from '../hooks/useSecurityEvents'
import { formatTime } from '../lib/formatTime'
import { securityEventLabel } from '../lib/securityEventLabels'

/** Read-only history of sensitive actions on the account. */
export function SecurityActivitySection() {
  const { events, status } = useSecurityEvents()

  return (
    <section className="profile-section-card" aria-labelledby="security-activity-title">
      <div className="profile-section-header">
        <div className="profile-section-title-wrap">
          <History className="profile-section-icon" aria-hidden="true" size={20} />
          <div>
            <h2 id="security-activity-title" className="profile-section-title">Hoạt động bảo mật</h2>
            <p className="profile-section-subtitle">Các thao tác nhạy cảm gần đây trên tài khoản của bạn</p>
          </div>
        </div>
      </div>

      {status === 'loading' && <p role="status">Đang tải hoạt động bảo mật…</p>}
      {status === 'error' && <p role="alert">Không tải được hoạt động bảo mật. Vui lòng thử lại sau.</p>}
      {status === 'ready' && events.length === 0 && <p>Chưa có hoạt động nào.</p>}
      {status === 'ready' && events.length > 0 && (
        <ul className="profile-oauth-list">
          {events.map((event) => (
            <li key={event.id} className="profile-oauth-item">
              <div>
                <strong className="profile-oauth-name">{securityEventLabel(event.eventType)}</strong>
                <span className="profile-oauth-status">
                  {[formatTime(event.createdAt), event.ipAddress, event.userAgent].filter(Boolean).join(' · ')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
