import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { adminErrorMessage, isAbort } from './adminErrors'

export interface AdminResource<T> {
  status: 'loading' | 'success' | 'error'
  data: T | null
  error: string | null
  reload: () => void
}

interface Settled<T> {
  requestKey: string
  data: T | null
  error: string | null
}

/** Loads `load()` whenever `key` changes or `reload()` is called, and cancels the request it replaces. */
export function useAdminResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>): AdminResource<T> {
  const [version, setVersion] = useState(0)
  const requestKey = `${key}#${version}`
  const [settled, setSettled] = useState<Settled<T>>({ requestKey: '', data: null, error: null })
  const runLoad = useEffectEvent(load)

  useEffect(() => {
    const controller = new AbortController()
    runLoad(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setSettled({ requestKey, data, error: null }) },
      (reason: unknown) => {
        if (controller.signal.aborted || isAbort(reason)) return
        setSettled({ requestKey, data: null, error: adminErrorMessage(reason) })
      },
    )
    return () => controller.abort()
  }, [requestKey])

  const reload = useCallback(() => setVersion((current) => current + 1), [])

  if (settled.requestKey !== requestKey) return { status: 'loading', data: null, error: null, reload }
  if (settled.error !== null) return { status: 'error', data: null, error: settled.error, reload }
  return { status: 'success', data: settled.data, error: null, reload }
}
