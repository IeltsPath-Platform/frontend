import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { toApiError, type ApiError } from '../api/apiError'
import { reportApiError } from './reviewGate'

interface ResourceState<T> {
  baseKey: string
  requestKey: string
  data: T | null
  error: ApiError | null
}

export interface ApiResource<T> {
  status: 'loading' | 'success' | 'error'
  data: T | null
  error: ApiError | null
  reload: () => void
  mutate: (updater: (current: T) => T) => void
}

/** Loads `load()` whenever `key` changes. A reload keeps showing the previous data of the same key. */
export function useApiResource<T>(key: string, load: () => Promise<T>): ApiResource<T> {
  const [version, setVersion] = useState(0)
  const requestKey = `${key}#${version}`
  const [state, setState] = useState<ResourceState<T>>({ baseKey: '', requestKey: '', data: null, error: null })
  const runLoad = useEffectEvent(load)

  useEffect(() => {
    let active = true
    runLoad().then(
      (data) => { if (active) setState({ baseKey: key, requestKey, data, error: null }) },
      (reason: unknown) => {
        const error = toApiError(reason)
        reportApiError(error)
        if (active) setState({ baseKey: key, requestKey, data: null, error })
      },
    )
    return () => { active = false }
  }, [key, requestKey])

  const reload = useCallback(() => setVersion((current) => current + 1), [])
  const mutate = useCallback((updater: (current: T) => T) => {
    setState((current) => (current.data === null ? current : { ...current, data: updater(current.data) }))
  }, [])

  const sameKey = state.baseKey === key
  const settled = state.requestKey === requestKey
  if (settled && state.error) return { status: 'error', data: null, error: state.error, reload, mutate }
  if (sameKey && state.data !== null) return { status: 'success', data: state.data, error: null, reload, mutate }
  return { status: 'loading', data: null, error: null, reload, mutate }
}
