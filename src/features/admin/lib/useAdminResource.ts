import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { ZodError } from 'zod'
import { HttpError } from '@/lib/httpClient'
import { adminErrorMessage, isAbort } from './adminErrors'

export interface AdminResource<T> {
  status: 'loading' | 'success' | 'error'
  data: T | null
  error: string | null
  /** Loads again from scratch: the page shows its loading state until the new answer arrives. */
  reload: () => void
  /** Loads again behind what is on screen: the old data stays until the new answer replaces it, and a failure is ignored. */
  refresh: () => void
}

interface Settled<T> {
  requestKey: string
  data: T | null
  error: string | null
}

/**
 * Loads `load()` whenever `key` changes, `reload()` is called or `refresh()` is called, and cancels the request it
 * replaces. `refresh()` is for polling: it never puts the page back into its loading state.
 */
export function useAdminResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>): AdminResource<T> {
  const [version, setVersion] = useState(0)
  const [refreshes, setRefreshes] = useState(0)
  const requestKey = `${key}#${version}`
  const [settled, setSettled] = useState<Settled<T>>({ requestKey: '', data: null, error: null })
  // The request key whose answer is on screen, so a refresh knows there is something to keep.
  const settledKey = useRef('')
  const runLoad = useEffectEvent(load)

  useEffect(() => {
    const controller = new AbortController()
    // The first load of a key reports its failure; a refresh only ever replaces data that is already on screen.
    const quiet = refreshes > 0 && settledKey.current === requestKey
    runLoad(controller.signal).then(
      (data) => { if (!controller.signal.aborted) { settledKey.current = requestKey; setSettled({ requestKey, data, error: null }) } },
      (reason: unknown) => {
        if (controller.signal.aborted || isAbort(reason) || quiet) return
        // A response the client cannot parse (not an HTTP error) otherwise shows only the generic message.
        if (!(reason instanceof HttpError)) {
          const issues = reason instanceof ZodError
            ? reason.issues.slice(0, 8).map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n')
            : ''
          console.error(`Admin resource "${requestKey}" failed\n${issues}`, reason)
        }
        setSettled({ requestKey, data: null, error: adminErrorMessage(reason) })
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
