import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/toast/ToastProvider'
import type { Suggestion } from '~types/learningPath'
import { OwlMascot } from './OwlMascot'
import { localDay, readRemindedDay } from './owl-suggestion-reminder'

const api = vi.hoisted(() => ({
  getProgress: vi.fn(),
  getHearts: vi.fn(),
  getQuests: vi.fn(),
  getBadges: vi.fn(),
  getSuggestions: vi.fn(),
}))
const session = vi.hoisted(() => ({ isLoggedIn: true, hydrated: true }))

vi.mock('@/features/learning-path/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/learning-path/api')>()),
  learningApi: api,
}))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => session }))

const SUGGESTION: Suggestion = {
  type: 'PRACTICE_SET', id: 'set-1', title: 'Bộ luyện: Câu chủ đề', knowledgePointId: 'kp-1',
  knowledgePointCode: null, reason: 'CONSOLIDATE', band: 5.5, skill: 'READING',
  action: { kind: 'BASKET_REVIEW', knowledgePointId: 'kp-1' },
}
const REMINDER = 'Hôm nay có 1 việc nhỏ giúp bạn chắc hơn: “Bộ luyện: Câu chủ đề”. Xem thử nhé?'

function mount(path: string) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}><OwlMascot /></MemoryRouter>
    </ToastProvider>,
  )
}

/** Moves the clock and lets the promises that the timers start settle. */
async function pass(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  window.localStorage.clear()
  session.isLoggedIn = true
  api.getProgress.mockResolvedValue(null)
  api.getHearts.mockResolvedValue(null)
  api.getQuests.mockResolvedValue({ date: '2026-10-26', completed: 0, quests: [] })
  api.getBadges.mockResolvedValue([])
  api.getSuggestions.mockReset().mockResolvedValue([SUGGESTION])
})

afterEach(() => vi.useRealTimers())

describe('OwlMascot suggestion reminder', () => {
  it('does not fetch suggestions until it is about to remind', async () => {
    mount('/home')
    await pass(1000)
    expect(api.getSuggestions).not.toHaveBeenCalled()

    await pass(6000)
    expect(api.getSuggestions).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(REMINDER)).toBeInTheDocument()
  })

  it('reminds once a day: the bubble goes away and does not return after moving on', async () => {
    const { unmount } = mount('/home')
    await pass(7000)
    expect(await screen.findByText(REMINDER)).toBeInTheDocument()
    expect(readRemindedDay()).toBe(localDay(new Date()))

    await pass(10_000)
    expect(screen.queryByText(REMINDER)).not.toBeInTheDocument()

    unmount()
    api.getSuggestions.mockClear()
    mount('/community')
    await pass(20_000)
    expect(screen.queryByText(REMINDER)).not.toBeInTheDocument()
    expect(api.getSuggestions).not.toHaveBeenCalled()
  })

  it('stays quiet on the course list, which already shows the strip', async () => {
    mount('/learn')
    await pass(20_000)
    expect(api.getSuggestions).not.toHaveBeenCalled()
    expect(screen.queryByText(REMINDER)).not.toBeInTheDocument()
  })

  it('stays quiet while the learner is taking a test', async () => {
    mount('/learn/tests/abc')
    await pass(20_000)
    expect(api.getSuggestions).not.toHaveBeenCalled()
  })

  it('says nothing and asks once when there is nothing to suggest', async () => {
    api.getSuggestions.mockResolvedValue([])
    mount('/home')
    await pass(7000)
    expect(api.getSuggestions).toHaveBeenCalledTimes(1)
    await pass(30_000)
    expect(api.getSuggestions).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/việc nhỏ/)).not.toBeInTheDocument()
  })

  it('does not nudge a signed-out visitor', async () => {
    session.isLoggedIn = false
    mount('/home')
    await pass(20_000)
    expect(api.getSuggestions).not.toHaveBeenCalled()
  })

  it('opens the suggestions tab when the bubble is clicked', async () => {
    mount('/home')
    await pass(7000)
    await userEvent.click(await screen.findByText(REMINDER))
    expect(await screen.findByRole('tab', { name: 'Gợi ý' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Luyện ngay' })).toBeInTheDocument()
  })

  it('loads suggestions when the panel is opened on the tab, without waiting for the reminder', async () => {
    window.localStorage.setItem('ielts-path.owl.suggestion-reminder-day', localDay(new Date()))
    mount('/home')
    await userEvent.click(screen.getByRole('button', { name: /Nhiệm vụ, huy hiệu và gợi ý/ }))
    expect(api.getSuggestions).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('tab', { name: 'Gợi ý' }))
    expect(api.getSuggestions).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Bộ luyện: Câu chủ đề')).toBeInTheDocument()
  })
})
