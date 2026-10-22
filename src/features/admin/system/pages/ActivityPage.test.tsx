import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { ActivityPage } from './ActivityPage'

const { fetchServiceSnapshot, fetchActivityStats } = vi.hoisted(() => ({ fetchServiceSnapshot: vi.fn(), fetchActivityStats: vi.fn() }))
vi.mock('../api/systemAdminApi', () => ({ fetchServiceSnapshot, fetchActivityStats }))

const stats = {
  from: '2026-10-01', to: '2026-10-03',
  daily: [
    { day: '2026-10-01', dau: 10, wau: 30, mau: 60 },
    { day: '2026-10-02', dau: 12, wau: 32, mau: 61 },
    { day: '2026-10-03', dau: 14, wau: 34, mau: 62 },
  ],
  retention: [{ weekStart: '2026-09-28T00:00:00Z', size: 30, week1: 0.5, week2: null, week4: 0.25, week8: null }],
}

describe('ActivityPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('applies the selected date range to the activity request', async () => {
    fetchActivityStats.mockResolvedValue(stats)
    render(<ActivityPage />)
    expect(await screen.findByRole('heading', { name: 'Hoạt động' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-10-03' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    await waitFor(() => expect(fetchActivityStats).toHaveBeenLastCalledWith(
      { from: '2026-10-01', to: '2026-10-03' }, expect.any(AbortSignal),
    ))
  })

  it('renders DAU chart and labels null cohort values as insufficient data', async () => {
    fetchActivityStats.mockResolvedValue(stats)
    render(<ActivityPage />)
    expect(await screen.findByRole('img', { name: /Người học hoạt động theo ngày/ })).toBeInTheDocument()
    expect(screen.getAllByText('Chưa đủ dữ liệu')).toHaveLength(2)
    expect(screen.getAllByText('14')).toHaveLength(3)
  })

  it('maps an overlong range error to Vietnamese', async () => {
    fetchActivityStats.mockRejectedValue(new HttpError(400, 'Bad Request', { details: { code: 'RANGE_TOO_LONG' } }))
    render(<ActivityPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Khoảng thời gian không được vượt quá 180 ngày.')
  })
})
