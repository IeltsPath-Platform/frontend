import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/features/learning-path/api'
import { OverviewStreakFreeze } from './OverviewStreakFreeze'

const api = vi.hoisted(() => ({ buyStreakFreeze: vi.fn() }))
vi.mock('@/features/learning-path/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/learning-path/api')>()),
  learningApi: api,
}))

const streak = (overrides = {}) => ({ currentDays: 4, longestDays: 9, activeToday: false, freezeAvailable: false, nextFreezeCost: 20, ...overrides })

afterEach(() => api.buyStreakFreeze.mockReset())

describe('OverviewStreakFreeze', () => {
  it('offers the purchase with its price while a streak is running', () => {
    render(<OverviewStreakFreeze streak={streak()} />)
    expect(screen.getByRole('button', { name: 'Mua đóng băng · 20 điểm' })).toBeEnabled()
  })

  it('shows the owned freeze instead of a buy button', () => {
    render(<OverviewStreakFreeze streak={streak({ freezeAvailable: true })} />)
    expect(screen.getByText('Có 1 lượt đóng băng bảo vệ chuỗi')).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('offers nothing without a streak to protect or a price', () => {
    const { container, rerender } = render(<OverviewStreakFreeze streak={streak({ currentDays: 0 })} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<OverviewStreakFreeze streak={streak({ nextFreezeCost: undefined })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('buys once and asks every statistics block to reload', async () => {
    api.buyStreakFreeze.mockResolvedValue({})
    const refreshed = vi.fn()
    window.addEventListener('study-statistics-changed', refreshed)
    render(<OverviewStreakFreeze streak={streak()} />)
    await userEvent.click(screen.getByRole('button', { name: /Mua đóng băng/ }))
    await waitFor(() => expect(refreshed).toHaveBeenCalledTimes(1))
    expect(api.buyStreakFreeze).toHaveBeenCalledTimes(1)
    window.removeEventListener('study-statistics-changed', refreshed)
  })

  it('reports a refusal and does not reload', async () => {
    api.buyStreakFreeze.mockRejectedValue(new ApiError(402, 'INSUFFICIENT_POINTS', 'Not enough points'))
    const refreshed = vi.fn()
    window.addEventListener('study-statistics-changed', refreshed)
    render(<OverviewStreakFreeze streak={streak()} />)
    await userEvent.click(screen.getByRole('button', { name: /Mua đóng băng/ }))
    expect(await screen.findByRole('alert')).toBeVisible()
    expect(refreshed).not.toHaveBeenCalled()
    window.removeEventListener('study-statistics-changed', refreshed)
  })

  it('reuses the request id when a retry follows an unavailable service', async () => {
    api.buyStreakFreeze.mockRejectedValueOnce(new ApiError(503, 'ACCESS_UNAVAILABLE', 'down')).mockResolvedValueOnce({})
    render(<OverviewStreakFreeze streak={streak()} />)
    await userEvent.click(screen.getByRole('button', { name: /Mua đóng băng/ }))
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: /Mua đóng băng/ }))
    await waitFor(() => expect(api.buyStreakFreeze).toHaveBeenCalledTimes(2))
    expect(api.buyStreakFreeze.mock.calls[1][0]).toBe(api.buyStreakFreeze.mock.calls[0][0])
  })
})
