import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gameApi } from '../api/gameApi'
import type { GameMatch, GameRoom } from '../types/game'
import { GameSetupPage } from './GameSetupPage'
import { SoloGameEntry } from '../components/SoloGameEntry'
import { startSoloRoom } from '../lib/startSoloRoom'

vi.mock('../api/gameApi', () => ({
  gameApi: {
    createRoom: vi.fn(),
    room: vi.fn(),
    ready: vi.fn(),
    start: vi.fn(),
    match: vi.fn(),
    leaveRoom: vi.fn(),
  },
}))

const room: GameRoom = {
  id: 'solo-room',
  roomCode: 'ABC123',
  hostUserId: 'learner',
  gameType: 'WORDLY',
  learningDomain: 'VOCABULARY',
  mode: 'PRACTICE',
  maxPlayers: 1,
  status: 'WAITING',
  createdAt: '2026-10-19T00:00:00Z',
  members: [],
  items: [],
  playerMode: 'SOLO',
  settings: {
    initialLives: 4,
    playMode: 'FINITE',
    wordLimit: 10,
    timeEnabled: true,
    wordTimeLimitSeconds: 180,
  },
  canStart: false,
  activeMatchId: null,
  message: null,
}
const match: GameMatch = {
  matchId: 'solo-match',
  roomId: room.id,
  sessionId: null,
  status: 'IN_PROGRESS',
  startedAt: '2026-10-19T00:00:00Z',
  players: [],
  playerMode: 'SOLO',
  settings: room.settings,
  ownPlayer: null,
  ranking: null,
}

function setup(mode = 'SOLO') {
  return render(
    <MemoryRouter initialEntries={[`/games/wordly/setup?mode=${mode}`]}>
      <Routes>
        <Route path="/games/wordly/setup" element={<GameSetupPage />} />
        <Route path="/games" element={<h1>Danh sách trò chơi</h1>} />
        <Route
          path="/games/matches/:matchId/play"
          element={<h1>Đang chơi</h1>}
        />
        <Route
          path="/games/rooms/:roomId"
          element={<h1>Sảnh nhiều người</h1>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  vi.resetAllMocks()
  vi.mocked(gameApi.createRoom).mockResolvedValue(room)
  vi.mocked(gameApi.room).mockResolvedValue(room)
  vi.mocked(gameApi.ready).mockResolvedValue(room)
  vi.mocked(gameApi.start).mockResolvedValue(match)
  vi.mocked(gameApi.match).mockResolvedValue(match)
  vi.mocked(gameApi.leaveRoom).mockResolvedValue({ ...room, status: 'CLOSED' })
})

afterEach(() => vi.unstubAllGlobals())

describe('Solo setup direct start', () => {
  it('creates, readies and starts before navigating straight to gameplay', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu chơi' }))
    await screen.findByRole('heading', { name: 'Đang chơi' })
    expect(gameApi.createRoom).toHaveBeenCalledWith({
      playerMode: 'SOLO',
      initialLives: 4,
      playMode: 'FINITE',
      wordLimit: 10,
      timeEnabled: true,
    })
    expect(gameApi.ready).toHaveBeenCalledWith(room.id, true)
    expect(gameApi.start).toHaveBeenCalledWith(room.id)
    expect(vi.mocked(gameApi.ready)).toHaveBeenCalledBefore(
      vi.mocked(gameApi.start),
    )
    expect(screen.queryByText('ABC123')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Sảnh nhiều người' }),
    ).not.toBeInTheDocument()
  })

  it('keeps multiplayer in the lobby without automatically readying or starting', async () => {
    vi.mocked(gameApi.createRoom).mockResolvedValue({
      ...room,
      playerMode: 'MULTIPLAYER',
      maxPlayers: 4,
    })
    setup('MULTIPLAYER')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo phòng chơi' }))
    await screen.findByRole('heading', { name: 'Sảnh nhiều người' })
    expect(gameApi.ready).not.toHaveBeenCalled()
    expect(gameApi.start).not.toHaveBeenCalled()
  })

  it('reuses the created solo room when start fails and the player retries', async () => {
    vi.mocked(gameApi.start).mockRejectedValueOnce(
      new Error('Library unavailable'),
    )
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu chơi' }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu chơi' }))
    await screen.findByRole('heading', { name: 'Đang chơi' })
    expect(gameApi.createRoom).toHaveBeenCalledTimes(1)
    expect(gameApi.start).toHaveBeenCalledTimes(2)
  })

  it('recovers a committed match if its start response was lost', async () => {
    vi.mocked(gameApi.start).mockRejectedValueOnce(new Error('Connection lost'))
    vi.mocked(gameApi.room).mockResolvedValue({
      ...room,
      status: 'IN_MATCH',
      activeMatchId: match.matchId,
    })
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu chơi' }))
    await screen.findByRole('heading', { name: 'Đang chơi' })
    expect(gameApi.match).toHaveBeenCalledWith(match.matchId)
    expect(gameApi.createRoom).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('replaces an unused room if the configuration changes after a failed start', async () => {
    vi.mocked(gameApi.start).mockRejectedValueOnce(
      new Error('Library unavailable'),
    )
    vi.mocked(gameApi.createRoom)
      .mockResolvedValueOnce(room)
      .mockResolvedValueOnce({ ...room, id: 'replacement-room' })
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu chơi' }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }))
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu chơi' }))
    await screen.findByRole('heading', { name: 'Đang chơi' })
    expect(gameApi.leaveRoom).toHaveBeenCalledWith(room.id)
    expect(gameApi.createRoom).toHaveBeenLastCalledWith(
      expect.objectContaining({ wordLimit: 6 }),
    )
    expect(gameApi.start).toHaveBeenLastCalledWith('replacement-room')
  })

  it('blocks repeat submissions while the starting request is pending', async () => {
    let finish: ((value: GameMatch) => void) | undefined
    vi.mocked(gameApi.start).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { container } = setup()
    const form = container.querySelector('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    await waitFor(() => expect(gameApi.start).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Đang bắt đầu…' })).toBeDisabled()
    expect(gameApi.createRoom).toHaveBeenCalledTimes(1)
    finish!(match)
    await screen.findByRole('heading', { name: 'Đang chơi' })
  })
})

describe('Legacy solo room entry', () => {
  it('resumes an active match without showing or readying a lobby', async () => {
    vi.mocked(gameApi.room).mockResolvedValue({
      ...room,
      status: 'IN_MATCH',
      activeMatchId: match.matchId,
    })
    render(
      <MemoryRouter initialEntries={['/games/rooms/solo-room']}>
        <Routes>
          <Route
            path="/games/rooms/:roomId"
            element={<SoloGameEntry roomId={room.id} />}
          />
          <Route
            path="/games/matches/:matchId/play"
            element={<h1>Đang chơi</h1>}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.queryByText('MÃ PHÒNG')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Sẵn sàng' }),
    ).not.toBeInTheDocument()
    await screen.findByRole('heading', { name: 'Đang chơi' })
    expect(gameApi.ready).not.toHaveBeenCalled()
    expect(gameApi.start).not.toHaveBeenCalled()
  })

  it('refuses to auto-start a multiplayer room', async () => {
    await expect(
      startSoloRoom({ ...room, playerMode: 'MULTIPLAYER' }),
    ).rejects.toThrow('chơi đơn')
    expect(gameApi.ready).not.toHaveBeenCalled()
    expect(gameApi.start).not.toHaveBeenCalled()
  })
})

it('does not redirect the player back after leaving while start is pending', async () => {
  let finish: ((value: GameMatch) => void) | undefined
  vi.mocked(gameApi.start).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu chơi' }))
  await waitFor(() => expect(gameApi.start).toHaveBeenCalledTimes(1))
  fireEvent.click(screen.getByRole('link', { name: 'Trò chơi' }))
  await screen.findByRole('heading', { name: 'Danh sách trò chơi' })
  await act(async () => {
    finish!(match)
  })
  expect(
    screen.getByRole('heading', { name: 'Danh sách trò chơi' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: 'Đang chơi' }),
  ).not.toBeInTheDocument()
})

it('does not ready or start a room if setup was left before creation finished', async () => {
  let finish: ((value: GameRoom) => void) | undefined
  vi.mocked(gameApi.createRoom).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu chơi' }))
  fireEvent.click(screen.getByRole('link', { name: 'Trò chơi' }))
  await screen.findByRole('heading', { name: 'Danh sách trò chơi' })
  await act(async () => {
    finish!(room)
  })
  expect(gameApi.ready).not.toHaveBeenCalled()
  expect(gameApi.start).not.toHaveBeenCalled()
})
