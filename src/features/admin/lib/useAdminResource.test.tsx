import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAdminResource } from './useAdminResource'

describe('useAdminResource refresh', () => {
  it('keeps what is shown while the new data loads, then swaps it in', async () => {
    let resolveNext: (value: string) => void = () => undefined
    const load = vi.fn()
      .mockResolvedValueOnce('first')
      .mockImplementationOnce(() => new Promise<string>((resolve) => { resolveNext = resolve }))
    const { result } = renderHook(() => useAdminResource('refresh-keeps', load))
    await waitFor(() => expect(result.current.data).toBe('first'))

    act(() => result.current.refresh())

    expect(result.current.status).toBe('success')
    expect(result.current.data).toBe('first')
    await act(async () => { resolveNext('second') })
    await waitFor(() => expect(result.current.data).toBe('second'))
  })

  it('keeps what is shown when a background refresh fails', async () => {
    const load = vi.fn().mockResolvedValueOnce('first').mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useAdminResource('refresh-fails', load))
    await waitFor(() => expect(result.current.data).toBe('first'))

    act(() => result.current.refresh())
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))

    expect(result.current.status).toBe('success')
    expect(result.current.data).toBe('first')
  })

  it('still shows the loading state and the error of a first load and of a reload', async () => {
    const load = vi.fn().mockResolvedValueOnce('first').mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useAdminResource('reload-fails', load))
    await waitFor(() => expect(result.current.data).toBe('first'))

    act(() => result.current.reload())
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('error'))
  })
})
