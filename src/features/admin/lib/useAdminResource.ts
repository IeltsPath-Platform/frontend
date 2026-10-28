import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { ZodError } from 'zod'
import { HttpError } from '@/lib/httpClient'
import { adminErrorMessage, isAbort } from './adminErrors'

export interface AdminResource<T> {
  status: 'loading' | 'success' | 'error'
  data: T | null
  error: string | null
  reload: () => void
  /** Loads again in the background: what is shown stays until the new data arrives, and a failure keeps it. */
  refresh: () => void
}

interface Settled<T> {
  requestKey: string
  data: T | null
  error: string | null
}

/** Loads `load()` whenever `key` changes or `reload()` is called, and cancels the request it replaces. */
export function useAdminResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>): AdminResource<T> {
  const [version, setVersion] = useState(0)
  const [refreshes, setRefreshes] = useState(0)
  const requestKey = `${key}#${version}`
  const [settled, setSettled] = useState<Settled<T>>({ requestKey: '', data: null, error: null })
  const runLoad = useEffectEvent(load)

  useEffect(() => {
    const controller = new AbortController()
    runLoad(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setSettled({ requestKey, data, error: null }) },
      (reason: unknown) => {
        if (controller.signal.aborted || isAbort(reason)) return
        // A response the client cannot parse (not an HTTP error) otherwise shows only the generic message.
        if (!(reason instanceof HttpError)) {
          const issues = reason instanceof ZodError
            ? reason.issues.slice(0, 8).map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n')
            : ''
          console.error(`Admin resource "${requestKey}" failed\n${issues}`, reason)
        }
        // A background refresh that fails must not wipe what the person is already reading.
        setSettled((previous) => (previous.requestKey === requestKey && previous.error === null
          ? previous
          : { requestKey, data: null, error: adminErrorMessage(reason) }))
      },
    )
    return () => controller.abort()
  }, [requestKey, refreshes])

  const reload = useCallback(() => setVersion((current) => current + 1), [])
  const refresh = useCallback(() => setRefreshes((current) => current + 1), [])

  if (settled.requestKey !== requestKey) return { status: 'loading', data: null, error: null, reload, refresh }
  if (settled.error !== null) return { status: 'error', data: null, error: settled.error, reload, refresh }
  return { status: 'success', data: settled.data, error: null, reload, refresh }
}
