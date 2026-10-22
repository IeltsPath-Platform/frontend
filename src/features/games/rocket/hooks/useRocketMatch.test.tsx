import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RocketCurrent, RocketRound } from '../types/rocket'
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

describe('useRocketMatch', () => {
  afterEach(() => vi.clearAllMocks())

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
