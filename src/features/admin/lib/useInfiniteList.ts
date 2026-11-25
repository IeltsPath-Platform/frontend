import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { adminErrorMessage, isAbort } from './adminErrors'

export interface PageResult<T> {
  content: T[]
  page: number
  totalElements: number | null
  totalPages: number | null
  hasMore?: boolean
}

export interface InfiniteListOptions<T> {
  getId?: (item: T) => string
}

export interface InfiniteList<T> {
  items: T[]
  total: number | null
  status: 'loading' | 'success' | 'error'
  error: string | null
  loadingMore: boolean
  moreError: string | null
  hasMore: boolean
  loadMore: () => void
  retryMore: () => void
  reload: () => void
  refresh: () => void
}

interface ListState<T> {
  key: string
  items: T[]
  page: number
  total: number | null
  totalPages: number | null
  hasMore: boolean
  status: 'loading' | 'success' | 'error'
  error: string | null
  loadingMore: boolean
  moreError: string | null
}

function emptyState<T>(key: string): ListState<T> {
  return { key, items: [], page: -1, total: null, totalPages: null, hasMore: false, status: 'loading', error: null, loadingMore: false, moreError: null }
}

function defaultId<T>(item: T): string {
  return String((item as { id: string }).id)
}

function mergeById<T>(existing: T[], incoming: T[], getId: (item: T) => string): T[] {
  const ids = new Set(existing.map(getId))
  const merged = [...existing]
  for (const item of incoming) {
    const id = getId(item)
    if (!ids.has(id)) {
      ids.add(id)
      merged.push(item)
    }
  }
  return merged
}

/** Loads server pages as a single list, keeping old rows during a background refresh. */
export function useInfiniteList<T>(
  key: string,
  load: (page: number, signal: AbortSignal) => Promise<PageResult<T>>,
  options: InfiniteListOptions<T> = {},
): InfiniteList<T> {
  const getId = options.getId ?? defaultId<T>
  const [state, setState] = useState<ListState<T>>(() => emptyState(key))
  const [firstPageVersion, setFirstPageVersion] = useState(0)
  const stateRef = useRef(state)
  useLayoutEffect(() => { stateRef.current = state }, [state])
  const generation = useRef(0)
  const firstRequest = useRef<AbortController | null>(null)
  const moreRequest = useRef<AbortController | null>(null)
  const loadFirstPage = useEffectEvent(load)

  // Adjust state during the render for the new key so stale rows are never shown for a different filter.
  if (state.key !== key) setState(emptyState(key))

  useEffect(() => {
    const controller = new AbortController()
    const currentGeneration = generation.current
    const keepRows = stateRef.current.key === key && stateRef.current.items.length > 0
    firstRequest.current = controller

    loadFirstPage(0, controller.signal).then(
      (result) => {
        if (controller.signal.aborted || generation.current !== currentGeneration) return
        if (firstRequest.current === controller) firstRequest.current = null
        setState((previous) => previous.key !== key ? previous : ({
          key,
          items: mergeById([], result.content, getId),
          page: result.page,
          total: result.totalElements,
          totalPages: result.totalPages,
          hasMore: result.hasMore ?? result.page + 1 < (result.totalPages ?? 0),
          status: 'success',
          error: null,
          loadingMore: false,
          moreError: null,
        }))
      },
      (reason: unknown) => {
        if (controller.signal.aborted || isAbort(reason) || generation.current !== currentGeneration) return
        if (firstRequest.current === controller) firstRequest.current = null
        setState((previous) => {
          if (previous.key !== key) return previous
          if (keepRows && previous.key === key && previous.items.length > 0) return { ...previous, loadingMore: false }
          return { ...emptyState<T>(key), status: 'error', error: adminErrorMessage(reason) }
        })
      },
    )

    return () => {
      controller.abort()
      if (firstRequest.current === controller) firstRequest.current = null
      moreRequest.current?.abort()
      moreRequest.current = null
    }
  }, [key, firstPageVersion, getId])

  const loadMore = useCallback(() => {
    const current = stateRef.current
    if (current.key !== key || current.status !== 'success' || current.page < 0 || !current.hasMore) return
    if (firstRequest.current && !firstRequest.current.signal.aborted) return
    if (moreRequest.current) return

    const controller = new AbortController()
    const currentGeneration = generation.current
    const nextPage = current.page + 1
    moreRequest.current = controller
    setState((previous) => previous.key === key ? { ...previous, loadingMore: true, moreError: null } : previous)

    load(nextPage, controller.signal).then(
      (result) => {
        if (controller.signal.aborted || generation.current !== currentGeneration) return
        setState((previous) => previous.key !== key ? previous : {
          ...previous,
          items: mergeById(previous.items, result.content, getId),
          page: result.page,
          total: result.totalElements,
          totalPages: result.totalPages,
          hasMore: result.hasMore ?? result.page + 1 < (result.totalPages ?? 0),
          loadingMore: false,
          moreError: null,
        })
      },
      (reason: unknown) => {
        if (controller.signal.aborted || isAbort(reason) || generation.current !== currentGeneration) return
        setState((previous) => previous.key === key
          ? { ...previous, loadingMore: false, moreError: adminErrorMessage(reason) }
          : previous)
      },
    ).finally(() => {
      if (moreRequest.current === controller) moreRequest.current = null
    })
  }, [getId, key, load])

  const retryMore = useCallback(() => loadMore(), [loadMore])
  const reload = useCallback(() => {
    generation.current += 1
    firstRequest.current?.abort()
    moreRequest.current?.abort()
    firstRequest.current = null
    moreRequest.current = null
    setState(emptyState(key))
    setFirstPageVersion((current) => current + 1)
  }, [key])
  const refresh = useCallback(() => {
    generation.current += 1
    firstRequest.current?.abort()
    moreRequest.current?.abort()
    firstRequest.current = null
    moreRequest.current = null
    const current = stateRef.current
    if (current.key !== key || current.items.length === 0) setState(emptyState(key))
    else setState((previous) => previous.key === key ? { ...previous, loadingMore: false, moreError: null } : previous)
    setFirstPageVersion((version) => version + 1)
  }, [key])

  const current = state.key === key ? state : emptyState<T>(key)
  return {
    items: current.items,
    total: current.total,
    status: current.status,
    error: current.error,
    loadingMore: current.loadingMore,
    moreError: current.moreError,
    hasMore: current.page >= 0 && current.hasMore,
    loadMore,
    retryMore,
    reload,
    refresh,
  }
}
