import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/features/learning-path/api/apiError'
import { HeartsDepletedDialog } from './HeartsDepletedDialog'
import { publishHeartsDepleted, subscribeHeartsChanged } from './owl-events'

const { getHearts, refillHearts, authSession } = vi.hoisted(() => ({
  getHearts: vi.fn(),
  refillHearts: vi.fn(),
  authSession: vi.fn(),
}))

vi.mock('@/features/auth/authSession', () => ({ useAuthSession: authSession }))
vi.mock('@/features/learning-path/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/learning-path/api')>()),
  learningApi: { getHearts, refillHearts },
}))

const EMPTY = { hearts: 0, maxHearts: 5, nextHeartAt: new Date(Date.now() + 90 * 60_000).toISOString(), refillCost: 5 }

describe('HeartsDepletedDialog', () => {
  beforeEach(() => {
    authSession.mockReturnValue({ isLoggedIn: true })
    getHearts.mockReset().mockResolvedValue(EMPTY)
    refillHearts.mockReset().mockResolvedValue({ ...EMPTY, hearts: 5, nextHeartAt: null })
  })

  it('stays closed until the learner runs out of hearts', () => {
    render(<HeartsDepletedDialog />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getHearts).not.toHaveBeenCalled()
  })

  it('says so, shows the wait and the price, and sells a full refill', async () => {
    const user = userEvent.setup()
    const changed = vi.fn()
    const unsubscribe = subscribeHeartsChanged(changed)
    render(<HeartsDepletedDialog />)
    act(() => publishHeartsDepleted())

    expect(await screen.findByRole('dialog', { name: 'Bạn đã hết tim rồi' })).toBeInTheDocument()
    const buy = await screen.findByRole('button', { name: 'Mua tim · 5 điểm' })
    expect(screen.getByText(/Tim kế tiếp sẽ về sau 1 giờ 30 phút/)).toBeInTheDocument()

    await user.click(buy)
    expect(refillHearts).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(changed).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('tells the learner who cannot afford it, and keeps the popup open', async () => {
    const user = userEvent.setup()
    refillHearts.mockRejectedValue(new ApiError(402, 'INSUFFICIENT_POINTS', 'Not enough points'))
    render(<HeartsDepletedDialog />)
    act(() => publishHeartsDepleted())
    await user.click(await screen.findByRole('button', { name: 'Mua tim · 5 điểm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn cần 5 điểm để hồi đầy tim nhưng chưa đủ điểm.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes with "Để sau" and does nothing for a visitor', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<HeartsDepletedDialog />)
    act(() => publishHeartsDepleted())
    await user.click(await screen.findByRole('button', { name: 'Để sau' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()

    authSession.mockReturnValue({ isLoggedIn: false })
    render(<HeartsDepletedDialog />)
    act(() => publishHeartsDepleted())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes quietly when the hearts turn out to be back already', async () => {
    getHearts.mockResolvedValue({ ...EMPTY, hearts: 2 })
    render(<HeartsDepletedDialog />)
    act(() => publishHeartsDepleted())
    await waitFor(() => expect(getHearts).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
