import { useCallback, useEffect, useState } from 'react'
import { profileApi, type ProfileSession } from '../api/profileApi'

export type SessionsStatus = 'loading' | 'ready' | 'error'

/** The signed-in devices of the current account, with the actions that end them. */
export function useSessions() {
  const [sessions, setSessions] = useState<ProfileSession[]>([])
  const [status, setStatus] = useState<SessionsStatus>('loading')

  const reload = useCallback(async () => {
    try {
      setSessions(await profileApi.listSessions())
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    let active = true
    profileApi.listSessions().then(
      (list) => {
        if (!active) return
        setSessions(list)
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

  const revoke = useCallback(async (sessionId: string) => {
    await profileApi.revokeSession(sessionId)
    await reload()
  }, [reload])

  const revokeOthers = useCallback(async () => {
    await profileApi.revokeOtherSessions()
    await reload()
  }, [reload])

  return { sessions, status, reload, revoke, revokeOthers }
}
