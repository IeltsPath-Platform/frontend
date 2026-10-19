import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { gameApi } from '../api/gameApi'
import type { GameResult } from '../types/game'
import { GameResultPage } from './GameResultPage'

vi.mock('@/features/auth/authSession', () => ({
  useAuthSession: () => ({ email: 'learner@example.test' }),
}))
vi.mock('../api/gameApi', () => ({
  gameApi: { result: vi.fn(), match: vi.fn(), room: vi.fn() },
}))

const result: GameResult = {
  matchId: 'finished-match',
  gameType: 'WORDLY',
  playerMode: 'SOLO',
  status: 'COMPLETED',
  endReason: 'WORD_LIMIT_REACHED',
  settings: {
    initialLives: 4,
    wordTimeLimitSeconds: null,
    playMode: 'FINITE',
    wordLimit: 5,
    timeEnabled: false,
  },
  player: {
    userId: 'learner',
    displayName: 'Learner',
    status: 'FINISHED',
    livesRemaining: 4,
    wordsProcessed: 5,
    wordsSolved: 5,
    wordsFailed: 0,
    wordsTimedOut: 0,
    bestStreak: 5,
    baseScore: 500,
    bonusScore: 150,
    totalScore: 650,
    totalSolveTimeMs: 5000,
  },
  startedAt: '2026-10-19T00:00:00Z',
  endedAt: '2026-10-19T00:00:05Z',
  durationMs: 5000,
}

function setup() {
  render(
    <MemoryRouter initialEntries={['/games/matches/finished-match/result']}>
      <Routes>
        <Route
          path="/games/matches/:matchId/result"
          element={<GameResultPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.resetAllMocks())

it.each(['WORD_LIMIT_REACHED', 'NO_LIVES_LEFT', 'PLAYER_LEFT'])(
  'solo replay returns to setup after %s without loading the lobby',
  async (endReason) => {
    vi.mocked(gameApi.result).mockResolvedValue({ ...result, endReason })
    setup()
    expect(
      await screen.findByRole('link', { name: 'Chơi lại' }),
    ).toHaveAttribute('href', '/games/wordly/setup?mode=SOLO')
    expect(gameApi.match).not.toHaveBeenCalled()
    expect(gameApi.room).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('link', { name: 'Về phòng chờ' }),
    ).not.toBeInTheDocument()
  },
)

it('multiplayer still offers its available waiting room after results', async () => {
  vi.mocked(gameApi.result).mockResolvedValue({
    ...result,
    playerMode: 'MULTIPLAYER',
  })
  vi.mocked(gameApi.match).mockResolvedValue({
    matchId: result.matchId,
    roomId: 'multiplayer-room',
    sessionId: null,
    status: 'COMPLETED',
    startedAt: result.startedAt,
    players: [],
    playerMode: 'MULTIPLAYER',
    settings: result.settings,
    ownPlayer: null,
    ranking: null,
  })
  vi.mocked(gameApi.room).mockResolvedValue({
    id: 'multiplayer-room',
    roomCode: 'ABC123',
    hostUserId: 'learner',
    gameType: 'WORDLY',
    learningDomain: 'VOCABULARY',
    mode: 'PRACTICE',
    maxPlayers: 4,
    status: 'WAITING',
    createdAt: result.startedAt,
    members: [
      {
        userId: 'learner',
        role: 'HOST',
        status: 'JOINED',
        joinedAt: result.startedAt,
        slotNumber: 1,
        displayName: 'Learner',
      },
    ],
    items: [],
    playerMode: 'MULTIPLAYER',
    settings: result.settings,
    canStart: false,
    activeMatchId: null,
    message: null,
  })
  setup()
  expect(
    await screen.findByRole('link', { name: 'Về phòng chờ' }),
  ).toHaveAttribute('href', '/games/rooms/multiplayer-room')
})
