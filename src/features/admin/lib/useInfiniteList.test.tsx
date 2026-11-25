import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useInfiniteList, type PageResult } from './useInfiniteList'

interface Row { id: string; label: string }

function page(content: Row[], pageNumber: number, totalPages: number, totalElements = content.length): PageResult<Row> {
  return { content, page: pageNumber, totalElements, totalPages }
}

describe('useInfiniteList', () => {
  it('loads page zero and appends the next page while removing duplicate ids', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce(page([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], 0, 2, 3))
      .mockResolvedValueOnce(page([{ id: 'b', label: 'B2' }, { id: 'c', label: 'C' }], 1, 2, 3))
    const { result } = renderHook(() => useInfiniteList<Row>('pages', load))
    await waitFor(() => expect(result.current.items).toHaveLength(2))

    act(() => {
      result.current.loadMore()
      result.current.loadMore()
    })
    await waitFor(() => expect(result.current.items.map((item) => item.id)).toEqual(['a', 'b', 'c']))
    expect(result.current.items[1]?.label).toBe('B')
    expect(result.current.total).toBe(3)
    expect(result.current.hasMore).toBe(false)
    expect(load.mock.calls.map(([pageNumber]) => pageNumber)).toEqual([0, 1])
  })

  it('aborts an old key request and ignores its late response', async () => {
    let resolveOld: (result: PageResult<Row>) => void = () => undefined
    let oldSignal: AbortSignal | undefined
    const load = vi.fn((key: string, signal: AbortSignal) => {
      if (key === 'old') {
        oldSignal = signal
        return new Promise<PageResult<Row>>((resolve) => { resolveOld = resolve })
      }
      return Promise.resolve(page([{ id: 'new', label: 'New' }], 0, 1))
    })
    const { result, rerender } = renderHook(({ key }) => useInfiniteList<Row>(key, (_pageNumber, signal) => load(key, signal)), {
      initialProps: { key: 'old' },
    })
    rerender({ key: 'new' })
    await waitFor(() => expect(result.current.items[0]?.id).toBe('new'))
    expect(oldSignal?.aborted).toBe(true)

    await act(async () => { resolveOld(page([{ id: 'old', label: 'Old' }], 0, 1)) })
    expect(result.current.items.map((item) => item.id)).toEqual(['new'])
  })

  it('does not request beyond the final page', async () => {
    const load = vi.fn().mockResolvedValue(page([{ id: 'only', label: 'Only' }], 0, 1))
    const { result } = renderHook(() => useInfiniteList<Row>('last', load))
    await waitFor(() => expect(result.current.status).toBe('success'))

    act(() => result.current.loadMore())
    expect(load).toHaveBeenCalledTimes(1)
    expect(result.current.hasMore).toBe(false)
  })

  it('shows a first-page error and permits reload', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page([{ id: 'a', label: 'A' }], 0, 1))
    const { result } = renderHook(() => useInfiniteList<Row>('first-error', load))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBeTruthy()

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.items[0]?.id).toBe('a'))
  })

  it('keeps loaded rows after a more-page error and retries only on request', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce(page([{ id: 'a', label: 'A' }], 0, 2, 2))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(page([{ id: 'b', label: 'B' }], 1, 2, 2))
    const { result } = renderHook(() => useInfiniteList<Row>('more-error', load))
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.moreError).toBeTruthy())
    expect(result.current.items.map((item) => item.id)).toEqual(['a'])
    expect(load).toHaveBeenCalledTimes(2)

    act(() => result.current.retryMore())
    await waitFor(() => expect(result.current.items.map((item) => item.id)).toEqual(['a', 'b']))
    expect(result.current.moreError).toBeNull()
  })

  it('keeps the current list visible during refresh and replaces it when page zero returns', async () => {
    let resolveRefresh: (result: PageResult<Row>) => void = () => undefined
    const load = vi.fn()
      .mockResolvedValueOnce(page([{ id: 'old', label: 'Old' }], 0, 2, 2))
      .mockResolvedValueOnce(page([{ id: 'old', label: 'Old' }, { id: 'old-2', label: 'Old 2' }], 1, 2, 2))
      .mockImplementationOnce(() => new Promise<PageResult<Row>>((resolve) => { resolveRefresh = resolve }))
    const { result } = renderHook(() => useInfiniteList<Row>('refresh', load))
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.items).toHaveLength(2))

    act(() => result.current.refresh())
    expect(result.current.items.map((item) => item.id)).toEqual(['old', 'old-2'])
    await act(async () => { resolveRefresh(page([{ id: 'fresh', label: 'Fresh' }], 0, 1, 1)) })
    await waitFor(() => expect(result.current.items.map((item) => item.id)).toEqual(['fresh']))
  })
})
