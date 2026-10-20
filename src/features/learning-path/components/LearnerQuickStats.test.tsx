import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserTierDropdown } from '@/components/UserTierDropdown'
import { learningApi } from '../api'
import { LearnerQuickStats } from './LearnerQuickStats'

vi.mock('../api', () => ({ learningApi: { getHearts: vi.fn(), getProgress: vi.fn(), getStreak: vi.fn() } }))

const streak = { currentDays: 7, longestDays: 12, freezeAvailable: false, nextFreezeCost: 10, activeToday: true, lostStreakDays: 0 }
const hearts = { hearts: 3, maxHearts: 5, nextHeartAt: null, refillCost: 50 }
const progress = { totalXp: 1850, level: 4, nextLevelAt: 2200, xpToNextLevel: 350, xpToday: 80, dailyCap: 200 }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(learningApi.getHearts).mockResolvedValue(hearts)
  vi.mocked(learningApi.getProgress).mockResolvedValue(progress)
  vi.mocked(learningApi.getStreak).mockResolvedValue(streak)
})

describe('LearnerQuickStats', () => {
  it('loads current hearts, earned XP and streak independently', async () => {
    render(<LearnerQuickStats />)
    expect(screen.getByText('Đang tải tim…')).toBeInTheDocument()
    expect(screen.getByText('Đang tải XP…')).toBeInTheDocument()
    expect(screen.getByText('Đang tải streak…')).toBeInTheDocument()
    expect(await screen.findByText('1.850')).toHaveTextContent('1.850 XP')
    expect(screen.getByRole('region', { name: 'Tim' })).toHaveTextContent('3 / 5')
    expect(screen.getByText('Cấp 4 · +80 XP hôm nay')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Streak' })).toHaveTextContent('7 ngày')
    expect(screen.getByText('Kỷ lục 12 ngày')).toBeInTheDocument()
    expect(screen.getByText('Đã học hôm nay')).toBeInTheDocument()
  })

  it('keeps XP visible when hearts fail and retries only hearts', async () => {
    vi.mocked(learningApi.getHearts).mockRejectedValueOnce(new Error('Unavailable'))
    render(<LearnerQuickStats />)
    expect(await screen.findByText('Chưa tải được tim')).toBeInTheDocument()
    expect(await screen.findByText('1.850')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại tim' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Tim' })).toHaveTextContent('3 / 5'))
    expect(learningApi.getHearts).toHaveBeenCalledTimes(2)
    expect(learningApi.getProgress).toHaveBeenCalledTimes(1)
  })

  it('shows an actual empty hearts balance without inventing XP after a failed request', async () => {
    vi.mocked(learningApi.getHearts).mockResolvedValue({ ...hearts, hearts: 0 })
    vi.mocked(learningApi.getProgress).mockRejectedValueOnce(new Error('Unavailable'))
    render(<LearnerQuickStats />)
    expect(await screen.findByText('Đang hồi phục')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tim' })).toHaveTextContent('0 / 5')
    expect(await screen.findByText('Chưa tải được XP')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'XP tích lũy' })).not.toHaveTextContent('0 XP')
  })

  it('retries streak independently while keeping hearts and XP visible', async () => {
    vi.mocked(learningApi.getStreak).mockRejectedValueOnce(new Error('Unavailable'))
    render(<LearnerQuickStats />)
    expect(await screen.findByText('Chưa tải được streak')).toBeInTheDocument()
    expect(await screen.findByText('1.850')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tim' })).toHaveTextContent('3 / 5')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại streak' }))
    expect(await screen.findByText('Đã học hôm nay')).toBeInTheDocument()
    expect(learningApi.getStreak).toHaveBeenCalledTimes(2)
    expect(learningApi.getHearts).toHaveBeenCalledTimes(1)
    expect(learningApi.getProgress).toHaveBeenCalledTimes(1)
  })

  it('shows a broken streak as zero and keeps the longest streak separate', async () => {
    vi.mocked(learningApi.getStreak).mockResolvedValue({ ...streak, currentDays: 0, activeToday: false, lostStreakDays: 7 })
    render(<LearnerQuickStats />)
    expect(await screen.findByText('Bắt đầu lại hôm nay')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Streak' })).toHaveTextContent('0 ngày')
    expect(screen.getByText('Kỷ lục 12 ngày')).toBeInTheDocument()
  })

  it('fetches only on opening and refreshes after dismissing and reopening the dropdown', async () => {
    const user = userEvent.setup()
    render(<UserTierDropdown userName="Học viên" />)
    expect(learningApi.getHearts).not.toHaveBeenCalled()
    expect(learningApi.getStreak).not.toHaveBeenCalled()
    const trigger = screen.getByText('Học viên').closest('summary')!
    await user.click(trigger)
    expect(await screen.findByText('1.850')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Tim, XP và streak của bạn' })).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
    await user.click(trigger)
    expect(await screen.findByText('1.850')).toBeInTheDocument()
    expect(learningApi.getProgress).toHaveBeenCalledTimes(2)
    expect(learningApi.getStreak).toHaveBeenCalledTimes(2)
    await user.click(document.body)
    await waitFor(() => expect(trigger.closest('details')).not.toHaveAttribute('open'))
  })
})
