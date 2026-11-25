import { useEffect, useState } from 'react'
import { profileApi, type SecurityEvent } from '../api/profileApi'

export type SecurityEventsStatus = 'loading' | 'ready' | 'error'

/** The newest security events of the current account, read once when the section opens. */
export function useSecurityEvents() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [status, setStatus] = useState<SecurityEventsStatus>('loading')

  useEffect(() => {
    let active = true
    profileApi.listSecurityEvents().then(
      (list) => {
        if (!active) return
        setEvents(list)
        setStatus('ready')
      },
      () => {
        if (active) setStatus('error')
      },
    )
    return () => {
      active = false
    }
  }, [])

  return { events, status }
}
