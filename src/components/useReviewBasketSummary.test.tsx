import { act, fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GamificationSummary } from '~types/learningPath'
import { publishGamification } from './owl-events'
import { useReviewBasketSummary } from './useReviewBasketSummary'

const api = vi.hoisted(() => ({ getReviewBasketSummary: vi.fn() }))

vi.mock('@/features/learning-path/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/learning-path/api')>()),
  learningApi: api,
}))

const REWARD: GamificationSummary = {
  xpEarned: 10, xpCapped: false, totalXp: 100, level: 1, leveledUp: false, heartsLost: null, heartsRemaining: null, nextHeartAt: null,
}

function Probe({ enabled }: { enabled: boolean }) {
  const summary = useReviewBasketSummary(enabled)
  return (
    <>
      <output data-testid="count">{summary ? `${summary.required}/${summary.due}` : 'none'}</output>
      <Link to="/home">home</Link>
      <Link to="/community">community</Link>
      <Link to="/learn/review-basket">basket</Link>
    </>
  )
}

/** Navigates the way a learner does, by following a link. */
const go = (name: string) => fireEvent.click(screen.getByRole('link', { name }))

function mount(enabled = true, path = '/home') {
  const view = render(<MemoryRouter initialEntries={[path]}><Probe enabled={enabled} /></MemoryRouter>)
  return {
    ...view,
    setEnabled: (next: boolean) => view.rerender(<MemoryRouter initialEntries={[path]}><Probe enabled={next} /></MemoryRouter>),
  }
}

const count = () => screen.getByTestId('count').textContent

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-26T10:00:00Z'), shouldAdvanceTime: false })
  api.getReviewBasketSummary.mockReset().mockResolvedValue({ required: 1, due: 2 })
})

afterEach(() => vi.useRealTimers())

describe('useReviewBasketSummary', () => {
  it('does not ask the backend for a visitor', async () => {
    mount(false)
    await act(async () => {})
    expect(api.getReviewBasketSummary).not.toHaveBeenCalled()
    expect(count()).toBe('none')
  })

  it('shows what the backend counted', async () => {
    mount()
    await act(async () => {})
    expect(api.getReviewBasketSummary).toHaveBeenCalledTimes(1)
    expect(count()).toBe('1/2')
  })

  it('asks again on navigation only after a while, but always on the review pages', async () => {
    mount()
    await act(async () => {})
    go('community')
    await act(async () => {})
    expect(api.getReviewBasketSummary).toHaveBeenCalledTimes(1)

    go('basket')
    await act(async () => {})
    expect(api.getReviewBasketSummary).toHaveBeenCalledTimes(2)

    await act(async () => { await vi.advanceTimersByTimeAsync(31_000) })
    go('home')
    await act(async () => {})
    expect(api.getReviewBasketSummary).toHaveBeenCalledTimes(3)
  })

  it('reloads after a submission, since finishing a review changes the count', async () => {
    mount()
    await act(async () => {})
    api.getReviewBasketSummary.mockResolvedValue({ required: 0, due: 1 })

    await act(async () => { publishGamification(REWARD) })

    expect(count()).toBe('0/1')
  })

  it('keeps the last number when a reload fails', async () => {
    mount()
    await act(async () => {})
    api.getReviewBasketSummary.mockRejectedValue(new Error('down'))

    await act(async () => { publishGamification(REWARD) })

    expect(count()).toBe('1/2')
  })

  it('drops the number on sign-out and never shows a late answer to the next account', async () => {
    let resolveLate: (value: { required: number, due: number }) => void = () => {}
    api.getReviewBasketSummary.mockReturnValue(new Promise((resolve) => { resolveLate = resolve }))
    const view = mount()
    view.setEnabled(false)
    await act(async () => { resolveLate({ required: 9, due: 9 }) })
    expect(count()).toBe('none')

    api.getReviewBasketSummary.mockResolvedValue({ required: 0, due: 0 })
    view.setEnabled(true)
    await act(async () => {})
    expect(count()).toBe('0/0')
  })
})
