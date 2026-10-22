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
