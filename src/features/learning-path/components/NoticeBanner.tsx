import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Info, X } from 'lucide-react'
import type { NavigationNotice } from './PageState'

function readNotice(state: unknown) {
  return state && typeof state === 'object' && 'notice' in state && typeof state.notice === 'string'
    ? (state as NavigationNotice).notice
    : null
}

/** Shows the message passed through router state after a redirect from a locked screen. */
export function NoticeBanner() {
  const location = useLocation()
  const notice = readNotice(location.state)
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)
  if (!notice || dismissedKey === location.key) return null

  return (
    <div className="lp-notice" role="status">
      <Info aria-hidden="true" size={18} />
      <p>{notice}</p>
      <button type="button" aria-label="Đóng thông báo" onClick={() => setDismissedKey(location.key)}><X aria-hidden="true" size={16} /></button>
    </div>
  )
}
