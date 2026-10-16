import { useCallback, useEffect, useEffectEvent, useReducer } from 'react'
import { useAuthSession } from '@/features/auth/authSession'
import { statisticsResourceReducer } from './statisticsResourceState'

export interface StatisticsResource<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
}

/** Per-card resource: a changed account or filter never renders an old response. */
export function useStatisticsResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>): StatisticsResource<T> {
  const { email, isLoggedIn } = useAuthSession()
  const resourceKey = JSON.stringify([isLoggedIn ? email : null, key])
  const [state, dispatch] = useReducer(statisticsResourceReducer<T>, {
    key: resourceKey, version: 0, data: null, error: null, loading: true,
  })
  // Reset before children render, including a rapid switch away and back to an account/filter.
  if (state.key !== resourceKey) dispatch({ type: 'scope', key: resourceKey })
  const { version } = state
  const run = useEffectEvent(load)
  const reload = useCallback(() => dispatch({ type: 'reload' }), [])
  useEffect(() => {
    if (!isLoggedIn) return
    const controller = new AbortController()
    run(controller.signal).then(
      (data) => { if (!controller.signal.aborted) dispatch({ type: 'success', key: resourceKey, version, data }) },
      (reason: unknown) => {
        if (!controller.signal.aborted) dispatch({ type: 'failure', key: resourceKey, version, error: reason instanceof Error ? reason.message : 'Không tải được dữ liệu.' })
      },
    )
    return () => controller.abort()
  }, [resourceKey, version, isLoggedIn])
  useEffect(() => {
    let lastFocusReload = -Infinity
    const refresh = () => { if (document.visibilityState === 'visible') reload() }
    const focus = () => {
      const now = performance.now()
      if (document.visibilityState !== 'visible' || now - lastFocusReload < 30_000) return
      lastFocusReload = now
      reload()
    }
    window.addEventListener('focus', focus)
    window.addEventListener('study-statistics-changed', refresh)
    return () => {
      window.removeEventListener('focus', focus)
      window.removeEventListener('study-statistics-changed', refresh)
    }
  }, [reload])
  const current = state.key === resourceKey && isLoggedIn
  return { data: current ? state.data : null, error: current ? state.error : null, loading: isLoggedIn && (!current || state.loading), reload }
}
