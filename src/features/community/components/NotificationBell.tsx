import { Bell, CheckCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCommunityNotifications } from '../hooks/useCommunityNotifications'
import { describeNotification } from '../lib/notificationView'
import './NotificationBell.css'

/** How long the pop-up under the bell stays when a notification arrives; the list in the bell keeps it after that. */
export const TOAST_MS = 8000

export function NotificationBell({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false)
  const { items, unread, error, announcement, fresh, dismissFresh, markRead, markAll } = useCommunityNotifications(enabled)

  useEffect(() => {
    if (!fresh) return
    const timer = window.setTimeout(dismissFresh, TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [fresh, dismissFresh])

  if (!enabled) return null
  const toast = fresh && !open
    ? describeNotification({ eventType: fresh.eventType, actorId: fresh.actorId, postId: fresh.postId ?? null, gradingJobId: fresh.gradingJobId ?? null })
    : null
  return <div className="community-notice-wrap">
    <button className="community-notice-trigger" type="button" aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`} aria-expanded={open} onClick={() => { dismissFresh(); setOpen(!open) }}>
      <Bell size={19} aria-hidden="true" />{unread > 0 && <span className="community-notice-count">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {announcement && <span className="community-notice-announcement" role="status">{announcement}</span>}
    {fresh && toast && <div className="community-notice-toast" data-testid="notification-toast">
      <Link to={toast.to} onClick={() => { void markRead(fresh.id); dismissFresh() }}>
        <strong>Thông báo mới</strong>
        <span>{toast.text}</span>
      </Link>
      <button type="button" aria-label="Đóng thông báo mới" onClick={dismissFresh}><X size={16} /></button>
    </div>}
    {open && <section className="community-notice-panel" aria-label="Thông báo" aria-live="polite">
      <header><strong>Thông báo</strong><div><Link to="/notifications/preferences" onClick={() => setOpen(false)}>Tùy chọn</Link><button type="button" aria-label="Đóng thông báo" onClick={() => setOpen(false)}><X size={17} /></button></div></header>
      {unread > 0 && <button className="community-notice-readall" type="button" onClick={() => void markAll()}><CheckCheck size={15} /> Đánh dấu đã đọc</button>}
      {error && <p role="alert">{error}</p>}
      {items.length === 0 ? <p className="community-empty">Chưa có thông báo.</p> : <ul>{items.map((item) => {
        const view = describeNotification(item)
        return <li key={item.id} className={item.readAt ? '' : 'is-unread'}>
          <Link to={view.to} onClick={() => { setOpen(false); if (!item.readAt) void markRead(item.id) }}>
            <span>{view.text}</span>
            <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN')}</time>
          </Link>
        </li>
      })}</ul>}
    </section>}
  </div>
}
