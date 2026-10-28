import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAdminResource } from './useAdminResource'

describe('useAdminResource', () => {
  it('keeps what is on screen while a refresh is under way, and swaps in the new answer', async () => {
    let answer = 'first'
    const load = vi.fn(async () => answer)
    const { result } = renderHook(() => useAdminResource('key', load))
    await waitFor(() => expect(result.current.data).toBe('first'))

    answer = 'second'
    const seen: string[] = []
    act(() => result.current.refresh())
    seen.push(result.current.status)
    await waitFor(() => expect(result.current.data).toBe('second'))
    seen.push(result.current.status)

    expect(seen).toEqual(['success', 'success'])
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('shows the loading state again for a reload', async () => {
    const { result } = renderHook(() => useAdminResource('key', async () => 'value'))
    await waitFor(() => expect(result.current.status).toBe('success'))

    act(() => result.current.reload())

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
  })

  it('ignores a refresh that fails and keeps the data it already has', async () => {
    let fail = false
    const load = vi.fn(async () => { if (fail) throw new Error('down'); return 'kept' })
    const { result } = renderHook(() => useAdminResource('key', load))
    await waitFor(() => expect(result.current.data).toBe('kept'))

    fail = true
    act(() => result.current.refresh())
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))

    expect(result.current.status).toBe('success')
    expect(result.current.data).toBe('kept')
  })

  it('still reports a failure of the first load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { result } = renderHook(() => useAdminResource('key', async () => { throw new Error('down') }))

    await waitFor(() => expect(result.current.status).toBe('error'))
  })
})
