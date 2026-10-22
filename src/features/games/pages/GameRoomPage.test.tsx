import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { gameApi } from '../api/gameApi'
import type { GameEvent, GameRoom } from '../types/game'
import { GameRoomPage } from './GameRoomPage'

const socket = vi.hoisted(() => ({ emit: (() => undefined) as (event: GameEvent) => void }))

vi.mock('../api/gameApi', () => ({ gameApi: { room: vi.fn() } }))
vi.mock('@/lib/httpClient', () => ({
  apiRequest: vi.fn().mockResolvedValue({ id: 'host' }),
  HttpError: class extends Error {},
}))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => ({ email: 'host@example.com' }) }))
vi.mock('@/components/toast/toastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('../hooks/useGameConnection', () => ({
  useGameConnection: (_roomId: string | null, onEvent: (event: GameEvent) => void) => {
    socket.emit = onEvent
    return true
  },
}))

function room(gameType: string, settings: GameRoom['settings']): GameRoom {
  return {
    id: 'room-1',
    roomCode: 'ROCK42',
    hostUserId: 'host',
    gameType,
    learningDomain: 'VOCABULARY',
    mode: 'PRACTICE',
    maxPlayers: 4,
    status: 'WAITING',
    createdAt: '2026-10-22T00:00:00Z',
    members: [
      { userId: 'host', role: 'HOST', status: 'READY', joinedAt: '', slotNumber: 1, displayName: 'Lan' },
      { userId: 'p2', role: 'PLAYER', status: 'READY', joinedAt: '', slotNumber: 2, displayName: 'Minh' },
    ],
    items: [],
    playerMode: 'MULTIPLAYER',
    settings,
    canStart: true,
    activeMatchId: null,
    message: null,
  }
}

function renderLobby() {
  render(
    <MemoryRouter initialEntries={['/games/rooms/room-1']}>
      <Routes>
        <Route path="/games/rooms/:roomId" element={<GameRoomPage />} />
        <Route path="/games/rocket/:matchId" element={<h1>Trận Tên lửa</h1>} />
        <Route path="/games/matches/:matchId/play" element={<h1>Trận Wordly</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GameRoomPage', () => {
  beforeEach(() => vi.mocked(gameApi.room).mockReset())

  it('shows Rocket settings and moves into the Rocket match when it starts', async () => {
    vi.mocked(gameApi.room).mockResolvedValue(
      room('ROCKET', {
        initialLives: 5,
        questionCount: 12,
        secondsPerQuestion: 20,
        timeEnabled: true,
        wordTimeLimitSeconds: null,
        playMode: 'FINITE',
        wordLimit: null,
      }),
    )
    renderLobby()
    expect(await screen.findByText('TÊN LỬA · NHIỀU NGƯỜI')).toBeInTheDocument()
    expect(screen.getByText('12 câu')).toBeInTheDocument()
    expect(screen.getByText('20 giây / câu')).toBeInTheDocument()
    expect(screen.getByText('5 mạng / người')).toBeInTheDocument()
    socket.emit({ type: 'MATCH_STARTED', match: { matchId: 'match-9' } as GameEvent['match'] })
    expect(await screen.findByRole('heading', { name: 'Trận Tên lửa' })).toBeInTheDocument()
  })

  it('keeps the Wordly lobby and play route', async () => {
    vi.mocked(gameApi.room).mockResolvedValue(
      room('WORDLY', {
        initialLives: 4,
        timeEnabled: true,
        wordTimeLimitSeconds: 180,
        playMode: 'FINITE',
        wordLimit: 10,
      }),
    )
    renderLobby()
    expect(await screen.findByText('WORDLY · NHIỀU NGƯỜI')).toBeInTheDocument()
    expect(screen.getByText('10 từ')).toBeInTheDocument()
    socket.emit({ type: 'MATCH_STARTED', match: { matchId: 'match-9' } as GameEvent['match'] })
    expect(await screen.findByRole('heading', { name: 'Trận Wordly' })).toBeInTheDocument()
  })
})
