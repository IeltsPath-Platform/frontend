import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ServicesPage } from './ServicesPage'

const { fetchServiceSnapshot, fetchActivityStats } = vi.hoisted(() => ({ fetchServiceSnapshot: vi.fn(), fetchActivityStats: vi.fn() }))
vi.mock('../api/systemAdminApi', () => ({ fetchServiceSnapshot, fetchActivityStats }))

const snapshot = {
  checkedAt: '2026-10-22T08:40:00Z',
  services: [
    { serviceId: 'CONTENT-SERVICE', status: 'UP', instances: [
      { instanceId: 'content-1', uri: 'http://content:8082', status: 'UP', responseMs: 34 },
      { instanceId: 'content-2', uri: 'http://content:8083', status: 'UP', responseMs: 12 },
    ] },
    { serviceId: 'ACCESS-SERVICE', status: 'DOWN', instances: [] },
  ],
}

describe('ServicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn())
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  })
  afterEach(() => vi.useRealTimers())

  it('shows service status, instance counts, fastest response, and URIs', async () => {
    fetchServiceSnapshot.mockResolvedValue(snapshot)
    render(<ServicesPage />)
    expect(await screen.findByRole('row', { name: /Content UP 2 12 ms/ })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Access DOWN 0/ })).toBeInTheDocument()
    expect(screen.getByText('http://content:8082')).toBeInTheDocument()
    expect(screen.getByText('Kiểm tra lúc 15:40:00')).toBeInTheDocument()
  })

  it('refreshes every 30 seconds while visible and stops after unmount', async () => {
    vi.useFakeTimers()
    fetchServiceSnapshot.mockResolvedValue(snapshot)
    const { unmount } = render(<ServicesPage />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(fetchServiceSnapshot).toHaveBeenCalledTimes(1)
    await act(async () => { vi.advanceTimersByTime(30_000); await Promise.resolve() })
    expect(fetchServiceSnapshot).toHaveBeenCalledTimes(2)
    unmount()
    await act(async () => { vi.advanceTimersByTime(60_000); await Promise.resolve() })
    expect(fetchServiceSnapshot).toHaveBeenCalledTimes(2)
  })

  it('keeps the last successful service table visible when refresh fails', async () => {
    fetchServiceSnapshot.mockResolvedValueOnce(snapshot).mockRejectedValueOnce(new Error('Gateway unavailable'))
    render(<ServicesPage />)
    expect(await screen.findByText('Content')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Gateway unavailable')
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('UP')).toBeInTheDocument()
  })

  it('does not poll while the tab is hidden', async () => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    fetchServiceSnapshot.mockResolvedValue(snapshot)
    render(<ServicesPage />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    await act(async () => { vi.advanceTimersByTime(60_000); await Promise.resolve() })
    expect(fetchServiceSnapshot).toHaveBeenCalledTimes(1)
  })
})
