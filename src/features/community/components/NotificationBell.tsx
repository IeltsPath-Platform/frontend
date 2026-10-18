import { Bell, CheckCheck, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCommunityNotifications } from '../hooks/useCommunityNotifications'
import './NotificationBell.css'

export function NotificationBell({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false)
  const { items, unread, error, announcement, markRead, markAll } = useCommunityNotifications(enabled)
  if (!enabled) return null
  return <div className="community-notice-wrap">
    <button className="community-notice-trigger" type="button" aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>
      <Bell size={19} aria-hidden="true" />{unread > 0 && <span className="community-notice-count">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {announcement && <span className="community-notice-announcement" role="status">{announcement}</span>}
    {open && <section className="community-notice-panel" aria-label="Thông báo" aria-live="polite">
      <header><strong>Thông báo</strong><div><Link to="/notifications/preferences" onClick={() => setOpen(false)}>Tùy chọn</Link><button type="button" aria-label="Đóng thông báo" onClick={() => setOpen(false)}><X size={17} /></button></div></header>
      {unread > 0 && <button className="community-notice-readall" type="button" onClick={() => void markAll()}><CheckCheck size={15} /> Đánh dấu đã đọc</button>}
      {error && <p role="alert">{error}</p>}
      {items.length === 0 ? <p className="community-empty">Chưa có thông báo.</p> : <ul>{items.map((item) => <li key={item.id} className={item.readAt ? '' : 'is-unread'}>
        <Link to={item.postId ? `/community/posts/${item.postId}` : `/community/users/${item.actorId}`} onClick={() => { setOpen(false); if (!item.readAt) void markRead(item.id) }}>
          <span>{item.eventType === 'community.user-followed.v1' ? 'Một học viên đã theo dõi bạn' : item.eventType === 'community.post-reacted.v1' ? 'Bài viết của bạn nhận được cảm xúc' : item.eventType === 'community.comment-mentioned.v1' ? 'Bạn được nhắc trong một bình luận' : item.eventType === 'community.comment-replied.v1' ? 'Có phản hồi mới trong cuộc trò chuyện' : 'Có bình luận mới trên bài viết'}</span>
          <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN')}</time>
        </Link>
      </li>)}</ul>}
    </section>}
  </div>
}
