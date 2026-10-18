import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteNavbar } from '@/components/SiteNavbar'
import { communityApi, type NotificationPreference } from '../api/communityApi'
import './community.css'

const labels: Record<string, { title: string; description: string }> = {
  'community.post-commented.v1': { title: 'Bình luận bài viết', description: 'Khi có người bình luận bài viết của bạn.' },
  'community.comment-replied.v1': { title: 'Phản hồi bình luận', description: 'Khi có người trả lời bình luận của bạn.' },
  'community.comment-mentioned.v1': { title: 'Được nhắc trong bình luận', description: 'Khi có người nhắc bạn trong một bình luận.' },
  'community.post-reacted.v1': { title: 'Cảm xúc bài viết', description: 'Khi có người bày tỏ cảm xúc với bài viết của bạn.' },
  'community.user-followed.v1': { title: 'Lượt theo dõi mới', description: 'Khi có người bắt đầu theo dõi bạn.' },
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
  return <div className="community-page"><SiteNavbar /><main className="notification-preferences-page">
    <Link to="/community">← Quay lại cộng đồng</Link>
    <h1>Tùy chọn thông báo</h1>
    <p>Bạn có thể bật hoặc tắt từng loại thông báo. Mặc định tất cả đều được bật.</p>
    {error && <p role="alert">{error}</p>}
    {preferences.length === 0 && !error ? <p role="status">Đang tải tùy chọn…</p> : <ul>{preferences.map((preference) => {
      const label = labels[preference.eventType] ?? { title: preference.eventType, description: '' }
      return <li key={preference.eventType}><div><strong>{label.title}</strong><p>{label.description}</p></div>
        <label><span className="sr-only">{label.title}</span><input type="checkbox" role="switch" checked={preference.enabled} onChange={(event) => void changePreference(preference.eventType, event.target.checked)} /></label>
      </li>
    })}</ul>}
  </main></div>
}
