import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RocketCurrent, RocketRound, RocketRoundResult } from '../types/rocket'
import { useRocketMatch } from './useRocketMatch'

const api = vi.hoisted(() => ({
  startSolo: vi.fn(),
  current: vi.fn(),
  answer: vi.fn(),
  leave: vi.fn(),
  result: vi.fn(),
}))

vi.mock('../api/rocketApi', () => ({ rocketApi: api }))

function current(round: Partial<RocketRound> | null, serverTime = new Date().toISOString()): RocketCurrent {
  return {
    matchId: 'm1',
    settings: { questionCount: 3, initialLives: 4, secondsPerQuestion: 15 },
    round: round && {
      roundId: 'r2',
      number: 2,
      total: 3,
      meaning: 'Tài xế',
      options: [
        { optionId: 'a', word: 'driver' },
        { optionId: 'b', word: 'actor' },
        { optionId: 'c', word: 'career' },
      ],
      opensAt: null,
      deadlineAt: null,
      serverTime,
      me: { answered: false, optionId: null },
      player: { livesRemaining: 4, totalScore: 180, status: 'ACTIVE' },
      ...round,
    },
    lastRoundResult: null,
    matchFinished: false,
    serverTime,
  }
}

const closedRound: RocketRound = {
  roundId: 'r1',
  number: 1,
  total: 3,
  meaning: 'Diễn viên',
  options: [
    { optionId: 'x', word: 'road' },
    { optionId: 'y', word: 'actor' },
    { optionId: 'z', word: 'honey' },
  ],
  opensAt: null,
  deadlineAt: null,
  serverTime: new Date().toISOString(),
  me: { answered: false, optionId: null },
  player: { livesRemaining: 4, totalScore: 0, status: 'ACTIVE' },
}

/** The page reloads while round 1's wrong answer is showing; round 2 opens shortly after. */
function reloadDuringReveal() {
  const opensAt = new Date(Date.now() + 150).toISOString()
  const last: RocketRoundResult = {
    roundId: 'r1',
    correctOptionId: 'y',
    chosenOptionId: 'x',
    correct: false,
    points: 0,
    livesRemaining: 3,
    totalScore: 0,
    status: 'ACTIVE',
    nextRoundAt: opensAt,
    matchFinished: false,
    endReason: null,
  }
  const open = { opensAt, deadlineAt: new Date(Date.parse(opensAt) + 15_000).toISOString() }
  api.current
    .mockResolvedValueOnce({ ...current({ opensAt }), lastRoundResult: last })
    .mockResolvedValue({ ...current(open), lastRoundResult: last })
}

describe('useRocketMatch', () => {
  afterEach(() => {
    vi.clearAllMocks()
    api.current.mockReset()
    sessionStorage.clear()
  })

  it('shows the closed round again after a reload during its reveal', async () => {
    sessionStorage.setItem('rocket:round:m1', JSON.stringify(closedRound))
    reloadDuringReveal()
    const stage = {
      showRound: vi.fn().mockResolvedValue(undefined),
      launch: vi.fn(),
      revealCorrect: vi.fn(),
      revealWrong: vi.fn().mockResolvedValue(undefined),
      travel: vi.fn().mockResolvedValue(undefined),
      idle: vi.fn(),
    }
    const { result } = renderHook(() => useRocketMatch('m1', stage, true))
    await waitFor(() => expect(result.current.state.phase).toBe('reveal'))
    expect(result.current.state.reveal?.correctOptionId).toBe('y')
    expect(result.current.state.lives).toBe(3)
    expect(stage.showRound).toHaveBeenNthCalledWith(1, ['road', 'actor', 'honey'])
    await waitFor(() => expect(result.current.state.phase).toBe('aiming'), { timeout: 3000 })
    expect(stage.revealWrong).toHaveBeenCalledWith(0, 1)
    expect(stage.travel).toHaveBeenCalled()
    expect(result.current.state.round?.number).toBe(2)
    expect(JSON.parse(sessionStorage.getItem('rocket:round:m1') ?? '{}').roundId).toBe('r2')
  })

  it('goes straight to the next round when the closed round was not remembered', async () => {
    reloadDuringReveal()
    const { result } = renderHook(() => useRocketMatch('m1', null, true))
    await waitFor(() => expect(result.current.state.phase).toBe('aiming'), { timeout: 2000 })
    expect(result.current.state.reveal).toBeNull()
    expect(result.current.state.round?.number).toBe(2)
  })

  it('waits for a round in its reveal pause to open before aiming', async () => {
    const opensAt = new Date(Date.now() + 200).toISOString()
    api.current
      .mockResolvedValueOnce(current({ opensAt }))
      .mockResolvedValueOnce(
        current({ opensAt, deadlineAt: new Date(Date.parse(opensAt) + 15_000).toISOString() }),
      )
    const { result } = renderHook(() => useRocketMatch('m1', null, true))
    await waitFor(() => expect(result.current.state.phase).toBe('aiming'), { timeout: 2000 })
    expect(api.current).toHaveBeenCalledTimes(2)
    expect(result.current.state.round?.number).toBe(2)
    expect(result.current.state.score).toBe(180)
  })

  it('shows the final result when the match has already ended', async () => {
    api.current.mockResolvedValueOnce({ ...current(null), matchFinished: true })
    api.result.mockResolvedValueOnce({ matchId: 'm1', endReason: 'PLAYER_LEFT' })
    const { result } = renderHook(() => useRocketMatch('m1', null, true))
    await waitFor(() => expect(result.current.state.phase).toBe('finished'))
    expect(result.current.state.final?.endReason).toBe('PLAYER_LEFT')
  })
})
