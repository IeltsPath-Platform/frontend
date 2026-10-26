import { useCallback, useEffect, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { API_BASE_URL } from '@/lib/env'
import { getAccessToken } from '@/lib/httpClient'
import { communityApi, type Notification } from '../api/communityApi'
import { NOTIFICATION_PUSHED } from '../lib/notificationEvents'

/** What the socket pushes the moment a notification is stored: enough to say what happened and where it leads. */
export type PushedNotification = Pick<Notification, 'id' | 'eventType' | 'actorId'> & Partial<Pick<Notification, 'postId' | 'gradingJobId'>>

export function useCommunityNotifications(enabled: boolean) {
  const [items, setItems] = useState<Notification[]>([])
  const [fresh, setFresh] = useState<PushedNotification | null>(null)
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const refresh = useCallback(async () => {
    try { const [list, count] = await Promise.all([communityApi.notifications(), communityApi.unread()]); setItems(list); setUnread(count.count); setError('') }
    catch { setError('Không thể tải thông báo. Vui lòng thử lại.') }
  }, [])
  useEffect(() => {
    if (!enabled) return
    void Promise.resolve().then(refresh)
    const ending = () => client.deactivate()
    let active = true
    const scheme = API_BASE_URL.startsWith('https:') ? 'wss:' : 'ws:'
    const endpoint = `${scheme}//${new URL(API_BASE_URL).host}/ws/notifications`
    const client = new Client({ reconnectDelay: 2500, webSocketFactory: () => new WebSocket(endpoint, ['v12.stomp', `bearer.${getAccessToken() ?? ''}`]) })
    client.onConnect = () => {
      void refresh()
      client.subscribe('/user/queue/notifications', (frame) => {
        try {
          const pushed = JSON.parse(frame.body) as Partial<PushedNotification>
          if (pushed.id) {
            setAnnouncement('Bạn có thông báo mới.')
            if (pushed.eventType) setFresh(pushed as PushedNotification)
            void refresh()
            window.dispatchEvent(new Event(NOTIFICATION_PUSHED))
          }
        } catch { setError('Nhận được thông báo không hợp lệ.') }
      })
    }
    client.onWebSocketError = () => setError('Kết nối thông báo bị gián đoạn; sẽ tự kết nối lại.')
    client.onWebSocketClose = () => { if (active) void refresh() }
    const stop = () => { active = false; ending() }
    window.addEventListener('study-session-ending', stop)
    client.activate()
    return () => { active = false; window.removeEventListener('study-session-ending', stop); void client.deactivate() }
  }, [enabled, refresh])
  const markRead = async (id: string) => { await communityApi.markRead(id); await refresh() }
  const markAll = async () => { await communityApi.markAll(); await refresh() }
  const dismissFresh = useCallback(() => setFresh(null), [])
  return { items, unread, error, announcement, fresh, dismissFresh, refresh, markRead, markAll }
}
