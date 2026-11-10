import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { learningApi } from '@/features/learning-path/api'
import { ProgressPage } from '@/features/learning-path/pages/ProgressPage'
import { OverviewAchievements } from './OverviewAchievements'

vi.mock('@/features/learning-path/api', async (original) => {
  const actual = await original<typeof import('@/features/learning-path/api')>()
  const { createMockLearningApi } = await import('@/features/learning-path/api/mock/mockLearningApi')
  return { ...actual, learningApi: createMockLearningApi({ storage: null, latencyMs: 0 }) }
})

beforeEach(() => vi.restoreAllMocks())

describe('overview achievements presentation', () => {
  it('presents live resource values and keeps detailed XP and streak rules available', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><OverviewAchievements /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Thành tích của bạn' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tiếp tục học' })).toHaveAttribute('href', '/learn')
    expect(await screen.findByText('1.240 XP tích lũy')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Tiến độ cấp 2' })).toHaveAttribute('value', '0.24')
    const xpRules = screen.getByText('Cách tính XP').closest('details')!
    expect(xpRules).not.toHaveAttribute('open')
    await user.click(screen.getByText('Cách tính XP'))
    expect(xpRules).toHaveAttribute('open')
    expect(xpRules).toHaveTextContent('XP từ câu hỏi được tính tối đa 100 XP/ngày')
    expect(screen.getByText('Cách giữ chuỗi & phần thưởng')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Huy hiệu' })).getAllByRole('heading', { level: 3 })).toHaveLength(3)
  })

  it('keeps other achievement sections usable when XP fails and retries only that resource', async () => {
    const originalProgress = learningApi.getProgress.bind(learningApi)
    const request = vi.spyOn(learningApi, 'getProgress').mockImplementation(originalProgress)
    request.mockRejectedValueOnce(new Error('XP unavailable'))
    render(<MemoryRouter><OverviewAchievements /></MemoryRouter>)
    const level = screen.getByRole('region', { name: 'Cấp và XP' })
    expect(await within(level).findByRole('alert')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Mua đóng băng · 10 điểm' })).toBeInTheDocument()
    await userEvent.setup().click(within(level).getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('1.240 XP tích lũy')).toBeInTheDocument()
    expect(request).toHaveBeenCalledTimes(2)
    expect(within(level).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('preserves the default learning progress presentation', async () => {
    render(<MemoryRouter><ProgressPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Tiến độ học' })).toBeInTheDocument()
    expect(await screen.findByText('1240 XP')).toBeInTheDocument()
    expect(screen.queryByText('Cách tính XP')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Tiếp tục học' })).not.toBeInTheDocument()
  })
})
