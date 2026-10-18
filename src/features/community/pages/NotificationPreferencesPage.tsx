import { ArrowLeft, AtSign, Bell, Heart, MessageCircle, Reply, UserPlus, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteNavbar } from '@/components/SiteNavbar'
import { communityApi, type NotificationPreference } from '../api/communityApi'
import './community.css'
import './NotificationPreferencesPage.css'

const labels: Record<string, { title: string; description: string; icon: LucideIcon; tone: string }> = {
  'community.post-commented.v1': { title: 'Bình luận bài viết', description: 'Khi có người bình luận bài viết của bạn.', icon: MessageCircle, tone: 'blue' },
  'community.comment-replied.v1': { title: 'Phản hồi bình luận', description: 'Khi có người trả lời bình luận của bạn.', icon: Reply, tone: 'violet' },
  'community.comment-mentioned.v1': { title: 'Được nhắc trong bình luận', description: 'Khi có người nhắc bạn trong một bình luận.', icon: AtSign, tone: 'amber' },
  'community.post-reacted.v1': { title: 'Cảm xúc bài viết', description: 'Khi có người bày tỏ cảm xúc với bài viết của bạn.', icon: Heart, tone: 'rose' },
  'community.user-followed.v1': { title: 'Lượt theo dõi mới', description: 'Khi có người bắt đầu theo dõi bạn.', icon: UserPlus, tone: 'green' },
}

export function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [error, setError] = useState('')
  useEffect(() => { void communityApi.notificationPreferences().then(setPreferences).catch(() => setError('Không thể tải tùy chọn thông báo.')) }, [])
  const changePreference = async (eventType: string, enabled: boolean) => {
    const previous = preferences
    setPreferences((items) => items.map((item) => item.eventType === eventType ? { ...item, enabled } : item))
    try { await communityApi.updateNotificationPreference(eventType, enabled); setError('') }
    catch { setPreferences(previous); setError('Không thể lưu tùy chọn. Hãy thử lại.') }
  }
  const activeCount = preferences.filter((item) => item.enabled).length
  return <div className="community-page"><SiteNavbar /><main className="notification-preferences-page">
    <Link className="notification-preferences-back" to="/community"><ArrowLeft size={16} aria-hidden="true" /> Quay lại cộng đồng</Link>
    <header className="notification-preferences-hero">
      <span className="notification-preferences-hero-icon" aria-hidden="true"><Bell size={26} /></span>
      <div>
        <h1>Tùy chọn thông báo</h1>
        <p>Bạn có thể bật hoặc tắt từng loại thông báo. Mặc định tất cả đều được bật.</p>
      </div>
      {preferences.length > 0 && <span className="notification-preferences-count">{activeCount}/{preferences.length} đang bật</span>}
    </header>
    {error && <p className="notification-preferences-error" role="alert">{error}</p>}
    {preferences.length === 0 && !error ? <p className="notification-preferences-loading" role="status">Đang tải tùy chọn…</p> : <ul className="notification-preferences-list">{preferences.map((preference) => {
      const label = labels[preference.eventType] ?? { title: preference.eventType, description: '', icon: Bell, tone: 'blue' }
      const Icon = label.icon
      return <li key={preference.eventType} className={preference.enabled ? 'is-on' : ''}>
        <span className={`notification-preferences-icon tone-${label.tone}`} aria-hidden="true"><Icon size={20} /></span>
        <div className="notification-preferences-text"><strong>{label.title}</strong><p>{label.description}</p></div>
        <label className="notification-switch"><span className="sr-only">{label.title}</span>
          <input type="checkbox" role="switch" checked={preference.enabled} onChange={(event) => void changePreference(preference.eventType, event.target.checked)} />
          <span className="notification-switch-track" aria-hidden="true"><span className="notification-switch-thumb" /></span>
        </label>
      </li>
    })}</ul>}
  </main></div>
}
