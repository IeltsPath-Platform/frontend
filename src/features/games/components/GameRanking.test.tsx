import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameRanking as Ranking } from '../types/game'
import { GameRanking } from './GameRanking'

const player = {
  slotNumber: 1,
  livesRemaining: 3,
  totalScore: 120,
  totalSolveTimeMs: 4000,
  wordsProcessed: 2,
  wordsSolved: 1,
  currentStreak: 1,
}
function ranking(isFinal = false): Ranking {
  return {
    matchId: 'match',
    status: isFinal ? 'COMPLETED' : 'IN_PROGRESS',
    playerMode: 'MULTIPLAYER',
    isFinal,
    serverTime: '2026-10-20T00:00:00Z',
    players: [
      { ...player, userId: 'me', displayName: 'Me', rank: 1, status: 'ACTIVE' },
      {
        ...player,
        userId: 'away',
        displayName: 'Away',
        rank: 2,
        status: 'DISCONNECTED',
        reconnectDeadlineAt: '2026-10-20T00:00:30Z',
      },
    ],
  }
}

describe('GameRanking reconnect grace', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-20T00:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('counts down the 30 second grace of a disconnected player', () => {
    render(<GameRanking ranking={ranking()} ownUserId="me" />)
    expect(screen.queryByText(/tự rời trận/)).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(0))
    expect(
      screen.getByText('Mất kết nối · tự rời trận sau 30 giây'),
    ).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(10_000))
    expect(
      screen.getByText('Mất kết nối · tự rời trận sau 20 giây'),
    ).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(21_000))
    expect(
      screen.getByText('Mất kết nối · đang xử lý rời trận…'),
    ).toBeInTheDocument()
  })

  it('hides the countdown in the final ranking', () => {
    render(<GameRanking ranking={ranking(true)} ownUserId="me" />)
    expect(screen.queryByText(/tự rời trận/)).not.toBeInTheDocument()
  })
})
