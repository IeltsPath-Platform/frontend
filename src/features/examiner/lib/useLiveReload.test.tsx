import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NOTIFICATION_PUSHED } from '@/features/community/lib/notificationEvents'
import { LIVE_RELOAD_INTERVAL_MS, useLiveReload } from './useLiveReload'

describe('useLiveReload', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('refreshes at once when a notification is pushed', () => {
    const refresh = vi.fn()
    renderHook(() => useLiveReload(refresh))

    window.dispatchEvent(new Event(NOTIFICATION_PUSHED))

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('checks again every minute while the page is visible, and stays quiet while it is hidden', () => {
    const refresh = vi.fn()
    renderHook(() => useLiveReload(refresh))

    vi.advanceTimersByTime(LIVE_RELOAD_INTERVAL_MS)
    expect(refresh).toHaveBeenCalledTimes(1)

    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    vi.advanceTimersByTime(LIVE_RELOAD_INTERVAL_MS)
    expect(refresh).toHaveBeenCalledTimes(1)
    visibility.mockRestore()
  })

  it('refreshes when the tab becomes visible again', () => {
    const refresh = vi.fn()
    renderHook(() => useLiveReload(refresh))

    document.dispatchEvent(new Event('visibilitychange'))

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('stops listening and polling once the page is gone', () => {
    const refresh = vi.fn()
    const view = renderHook(() => useLiveReload(refresh))
    view.unmount()

    window.dispatchEvent(new Event(NOTIFICATION_PUSHED))
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(LIVE_RELOAD_INTERVAL_MS * 2)

    expect(refresh).not.toHaveBeenCalled()
  })
})
