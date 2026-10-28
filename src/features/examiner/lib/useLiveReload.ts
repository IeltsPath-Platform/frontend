import { useEffect, useEffectEvent } from 'react'
import { NOTIFICATION_PUSHED } from '@/features/community/lib/notificationEvents'

/** How often a page the examiner leaves open checks for new work when no notification arrives (the socket can drop). */
export const LIVE_RELOAD_INTERVAL_MS = 60_000

/**
 * Keeps what the examiner is looking at up to date without a reload button: `refresh` runs when a notification is pushed
 * (a learner just chose them), when the tab becomes visible again, and every minute while it is visible.
 */
export function useLiveReload(refresh: () => void, intervalMs: number = LIVE_RELOAD_INTERVAL_MS) {
  const run = useEffectEvent(refresh)

  useEffect(() => {
    const whenVisible = () => { if (document.visibilityState === 'visible') run() }
    const timer = window.setInterval(whenVisible, intervalMs)
    window.addEventListener(NOTIFICATION_PUSHED, run)
    document.addEventListener('visibilitychange', whenVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener(NOTIFICATION_PUSHED, run)
      document.removeEventListener('visibilitychange', whenVisible)
    }
  }, [intervalMs])
}
