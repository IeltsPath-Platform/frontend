import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RocketMatchState } from '../hooks/useRocketMatch'
import { RocketHud } from './RocketHud'

const round = {
  roundId: 'r1',
  number: 1,
  total: 6,
  meaning: 'Diễn viên (nam)',
  options: [
    { optionId: 'a', word: 'driver' },
    { optionId: 'b', word: 'actor' },
    { optionId: 'c', word: 'career' },
  ],
  opensAt: '2026-10-21T00:00:00Z',
  deadlineAt: '2026-10-21T00:00:15Z',
  serverTime: '2026-10-21T00:00:00Z',
  me: { answered: false, optionId: null },
  player: { livesRemaining: 4, totalScore: 0, status: 'ACTIVE' as const },
}

function state(patch: Partial<RocketMatchState> = {}): RocketMatchState {
  return {
    phase: 'aiming',
    settings: { questionCount: 6, initialLives: 4, secondsPerQuestion: 15 },
    round,
    lives: 4,
    score: 0,
    chosenOptionId: null,
    reveal: null,
    final: null,
    error: null,
    clockOffsetMs: 0,
    playerMode: 'SOLO',
    ownUserId: null,
    ranking: null,
    answeredUserIds: [],
    answeredCount: null,
    aliveCount: null,
    spectating: false,
    roomClosed: false,
    ...patch,
  }
}

function renderHud(value: RocketMatchState, onChoose = vi.fn()) {
  render(
    <RocketHud
      state={value}
      timeFraction={0.5}
      seconds={8}
      hovered={null}
      soundOn
      onHover={vi.fn()}
      onChoose={onChoose}
      onToggleSound={vi.fn()}
      onExit={vi.fn()}
    />,
  )
  return onChoose
}

describe('RocketHud', () => {
  it('shows the meaning and lets the player pick an option while aiming', () => {
    const onChoose = renderHud(state())
    expect(screen.getByText('Diễn viên (nam)')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Còn 4 trên 4 mạng' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'actor' }))
    expect(onChoose).toHaveBeenCalledWith('b')
  })

  it('marks the wrong pick and the correct answer during the reveal and locks the buttons', () => {
    renderHud(
      state({
        phase: 'reveal',
        chosenOptionId: 'c',
        lives: 3,
        reveal: {
          roundId: 'r1',
          correctOptionId: 'b',
          chosenOptionId: 'c',
          correct: false,
          points: 0,
          livesRemaining: 3,
          totalScore: 0,
          status: 'ACTIVE',
          nextRoundAt: null,
          matchFinished: false,
          endReason: null,
        },
      }),
    )
    const wrong = screen.getByRole('button', { name: /career/ })
    const right = screen.getByRole('button', { name: /actor/ })
    expect(wrong).toHaveClass('is-wrong')
    expect(right).toHaveClass('is-correct')
    expect(wrong).toBeDisabled()
    expect(screen.getByText('-1')).toBeInTheDocument()
  })
})

describe('RocketHud multiplayer', () => {
  const players = [
    { userId: 'lan', displayName: 'Lan', slotNumber: 1, rank: 1, status: 'ACTIVE', totalScore: 540 },
    { userId: 'me', displayName: 'Minh', slotNumber: 2, rank: 2, status: 'ACTIVE', totalScore: 320 },
    {
      userId: 'an',
      displayName: 'An',
      slotNumber: 3,
      rank: 3,
      status: 'DISCONNECTED',
      totalScore: 180,
      reconnectDeadlineAt: new Date(Date.now() + 20_000).toISOString(),
    },
    { userId: 'bao', displayName: 'Bảo', slotNumber: 4, rank: 4, status: 'ELIMINATED', totalScore: 90 },
  ].map((player) => ({ livesRemaining: 3, totalSolveTimeMs: 0, wordsProcessed: 1, wordsSolved: 1, currentStreak: 0, ...player }))
  const multiplayer = (patch: Partial<RocketMatchState> = {}) =>
    state({
      playerMode: 'MULTIPLAYER',
      ownUserId: 'me',
      ranking: { matchId: 'm1', status: 'IN_PROGRESS', playerMode: 'MULTIPLAYER', isFinal: false, serverTime: '', players },
      ...patch,
    })

  it('ranks players beside the round, highlighting the player and dimming the eliminated', async () => {
    renderHud(multiplayer({ phase: 'locked', answeredUserIds: ['lan'], answeredCount: 2, aliveCount: 3 }))
    const panel = screen.getByRole('complementary', { name: 'Xếp hạng trực tiếp' })
    const rows = panel.querySelectorAll('li')
    expect([...rows].map((row) => row.querySelector('.rocket-ranking-name')?.firstChild?.textContent)).toEqual([
      'Lan',
      'Bạn',
      'An',
      'Bảo',
    ])
    expect(rows[1]).toHaveClass('is-me')
    expect(rows[3]).toHaveClass('is-out')
    expect(rows[0].querySelector('[aria-label="đã trả lời"]')).not.toBeNull()
    expect(rows[1].querySelector('[aria-label="đã trả lời"]')).toBeNull()
    expect(await screen.findAllByText(/tự rời trận sau (19|20) giây/)).not.toHaveLength(0)
    expect(screen.getByText('Đang chờ 2/3 người')).toBeInTheDocument()
  })

  it('hides the answers from a spectator', () => {
    renderHud(multiplayer({ phase: 'locked', spectating: true }))
    expect(screen.getByText('Bạn đã bị loại — đang xem')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'actor' })).toBeNull()
  })

  it('shows no ranking in solo play', () => {
    renderHud(state())
    expect(screen.queryByRole('complementary')).toBeNull()
  })
})
