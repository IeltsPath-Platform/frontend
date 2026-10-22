import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameEvent, GameRanking, RankingPlayer } from '../../types/game'
import type { RocketCurrent, RocketRound, RocketRoundResult } from '../types/rocket'
import { useRocketMatch } from './useRocketMatch'

const api = vi.hoisted(() => ({
  startSolo: vi.fn(),
  current: vi.fn(),
  answer: vi.fn(),
  leave: vi.fn(),
  result: vi.fn(),
  match: vi.fn(),
  ranking: vi.fn(),
}))

/** Stand-in for the room socket: tests push events and flip the connection. */
const socket = vi.hoisted(() => ({
  roomId: null as string | null,
  connected: false,
  emit: (() => undefined) as (event: Record<string, unknown>) => void,
}))

vi.mock('../api/rocketApi', () => ({ rocketApi: api }))
vi.mock('../../hooks/useGameConnection', () => ({
  useGameConnection: (roomId: string | null, onEvent: (event: GameEvent) => void) => {
    socket.roomId = roomId
    socket.emit = (event) => onEvent(event as GameEvent)
    return socket.connected && Boolean(roomId)
  },
}))

beforeEach(() => {
  api.match.mockResolvedValue({ roomId: null, playerMode: 'SOLO', ownUserId: null, ranking: null })
})

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
    api.answer.mockReset()
    api.ranking.mockReset()
    socket.connected = false
    socket.roomId = null
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

function player(userId: string, rank: number, totalScore: number, status = 'ACTIVE'): RankingPlayer {
  return {
    userId,
    displayName: userId,
    slotNumber: rank,
    rank,
    status,
    livesRemaining: 3,
    totalScore,
    totalSolveTimeMs: 0,
    wordsProcessed: 1,
    wordsSolved: 1,
    currentStreak: 0,
  }
}

function ranking(players: RankingPlayer[], isFinal = false): GameRanking {
  return { matchId: 'm1', status: 'IN_PROGRESS', playerMode: 'MULTIPLAYER', isFinal, serverTime: new Date().toISOString(), players }
}

/** Round `n` of a multiplayer match, open now for 15 s. */
function openRound(n: number, patch: Partial<RocketRound> = {}): RocketCurrent {
  const now = Date.now()
  return current({
    roundId: `r${n}`,
    number: n,
    total: 5,
    opensAt: new Date(now).toISOString(),
    deadlineAt: new Date(now + 15_000).toISOString(),
    ...patch,
  })
}

function roundResult(roundId: string, answers: Array<Record<string, unknown>>, patch: Record<string, unknown> = {}) {
  return {
    type: 'ROCKET_ROUND_RESULT',
    matchId: 'm1',
    roundId,
    correctOptionId: 'a',
    answers,
    ranking: ranking([player('me', 1, 380), player('lan', 2, 180)]),
    nextRoundAt: new Date(Date.now() + 100).toISOString(),
    matchFinished: false,
    endReason: null,
    ...patch,
  }
}

const mine = (patch: Record<string, unknown> = {}) => ({
  userId: 'me',
  optionId: 'a',
  correct: true,
  points: 200,
  livesRemaining: 4,
  totalScore: 380,
  status: 'ACTIVE',
  ...patch,
})

const answered = (userId: string, roundId = 'r2') => ({
  type: 'ROCKET_PLAYER_ANSWERED',
  matchId: 'm1',
  roundId,
  userId,
  answeredCount: 2,
  aliveCount: 2,
})

const ack = (optionId: string) => ({ requestId: 'x', roundId: 'r2', optionId, receivedAt: '', roundResult: null })

function stage() {
  return {
    showRound: vi.fn().mockResolvedValue(undefined),
    launch: vi.fn().mockResolvedValue(undefined),
    revealCorrect: vi.fn().mockResolvedValue(undefined),
    revealWrong: vi.fn().mockResolvedValue(undefined),
    travel: vi.fn().mockResolvedValue(undefined),
    idle: vi.fn().mockResolvedValue(undefined),
  }
}

describe('useRocketMatch multiplayer', () => {
  beforeEach(() => {
    api.match.mockResolvedValue({
      roomId: 'room-1',
      playerMode: 'MULTIPLAYER',
      ownUserId: 'me',
      ranking: ranking([player('lan', 1, 180), player('me', 2, 180)]),
    })
    api.ranking.mockResolvedValue(ranking([player('lan', 1, 180), player('me', 2, 180)]))
  })

  afterEach(() => {
    vi.clearAllMocks()
    api.current.mockReset()
    api.answer.mockReset()
    api.ranking.mockReset()
    socket.connected = false
    socket.roomId = null
    sessionStorage.clear()
  })

  async function startAiming(scene: ReturnType<typeof stage> | null = stage()) {
    const hook = renderHook(() => useRocketMatch('m1', scene, true))
    await waitFor(() => expect(hook.result.current.state.phase).toBe('aiming'))
    return hook
  }

  it('waits for the others after answering, then reveals the socket result once', async () => {
    api.current.mockResolvedValueOnce(openRound(2))
    api.answer.mockResolvedValueOnce(ack('a'))
    const scene = stage()
    const { result } = await startAiming(scene)
    expect(socket.roomId).toBe('room-1')
    expect(result.current.state.playerMode).toBe('MULTIPLAYER')

    act(() => result.current.choose('a'))
    await waitFor(() => expect(result.current.state.phase).toBe('locked'))
    act(() => {
      socket.emit(answered('lan'))
      socket.emit(answered('lan'))
    })
    expect(result.current.state.answeredUserIds).toEqual(['lan'])
    expect(result.current.state.answeredCount).toBe(2)

    api.current.mockResolvedValue(openRound(3))
    const event = roundResult('r2', [mine(), { ...mine(), userId: 'lan', optionId: 'b', correct: false, points: 0, totalScore: 180 }])
    act(() => {
      socket.emit(event)
      socket.emit(event)
    })
    await waitFor(() => expect(result.current.state.phase).toBe('reveal'))
    expect(result.current.state.reveal).toMatchObject({ roundId: 'r2', correct: true, points: 200, totalScore: 380 })
    expect(result.current.state.ranking?.players[0].userId).toBe('me')
    await waitFor(() => expect(result.current.state.round?.number).toBe(3), { timeout: 3000 })
    await waitFor(() => expect(result.current.state.phase).toBe('aiming'))
    expect(scene.revealCorrect).toHaveBeenCalledTimes(1)
    expect(result.current.state.answeredUserIds).toEqual([])
  })

  it('ignores events about rounds other than the one on screen', async () => {
    api.current.mockResolvedValueOnce(openRound(3))
    const scene = stage()
    const { result } = await startAiming(scene)
    act(() => {
      socket.emit(roundResult('r2', [mine()]))
      socket.emit(answered('lan', 'r2'))
      socket.emit({ type: 'ROCKET_ROUND_STARTED', matchId: 'm1', round: { roundId: 'r3', number: 3 }, serverTime: '' })
      socket.emit({ ...roundResult('r3', [mine()]), matchId: 'other-match' })
    })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(result.current.state.phase).toBe('aiming')
    expect(result.current.state.round?.roundId).toBe('r3')
    expect(result.current.state.reveal).toBeNull()
    expect(result.current.state.answeredUserIds).toEqual([])
    expect(scene.revealCorrect).not.toHaveBeenCalled()
    expect(scene.revealWrong).not.toHaveBeenCalled()
    expect(api.current).toHaveBeenCalledTimes(1)
  })

  it('follows a newer round announced on the socket', async () => {
    api.current.mockResolvedValueOnce(openRound(2, { me: { answered: true, optionId: 'b' } }))
    const { result } = renderHook(() => useRocketMatch('m1', null, true))
    await waitFor(() => expect(result.current.state.phase).toBe('locked'))
    expect(result.current.state.chosenOptionId).toBe('b')
    api.current.mockResolvedValueOnce(openRound(3))
    act(() => socket.emit({ type: 'ROCKET_ROUND_STARTED', matchId: 'm1', round: { roundId: 'r3', number: 3 }, serverTime: '' }))
    await waitFor(() => expect(result.current.state.round?.number).toBe(3))
    expect(result.current.state.phase).toBe('aiming')
  })

  it('resyncs with the current round and ranking when the socket reconnects', async () => {
    api.current.mockResolvedValueOnce(openRound(2))
    api.answer.mockResolvedValueOnce(ack('b'))
    const scene = stage()
    const { result, rerender } = await startAiming(scene)
    act(() => result.current.choose('b'))
    await waitFor(() => expect(result.current.state.phase).toBe('locked'))

    // The result event was missed while the socket was down.
    const last: RocketRoundResult = {
      roundId: 'r2',
      correctOptionId: 'a',
      chosenOptionId: 'b',
      correct: false,
      points: 0,
      livesRemaining: 3,
      totalScore: 180,
      status: 'ACTIVE',
      nextRoundAt: null,
      matchFinished: false,
      endReason: null,
    }
    api.current.mockResolvedValueOnce({
      ...openRound(3, { deadlineAt: null, opensAt: new Date(Date.now() + 50).toISOString() }),
      lastRoundResult: last,
    })
    api.current.mockResolvedValue({ ...openRound(3), lastRoundResult: last })
    api.ranking.mockResolvedValueOnce(ranking([player('lan', 1, 380), player('me', 2, 180)]))
    socket.connected = true
    rerender()
    await waitFor(() => expect(result.current.state.phase).toBe('reveal'))
    expect(result.current.state.reveal?.correct).toBe(false)
    expect(result.current.state.lives).toBe(3)
    expect(scene.revealWrong).toHaveBeenCalledWith(1, 0)
    expect(result.current.state.ranking?.players[0].userId).toBe('lan')
    await waitFor(() => expect(result.current.state.round?.number).toBe(3), { timeout: 3000 })
  })

  it('keeps the requestId when an answer is retried after a network failure', async () => {
    api.current.mockResolvedValue(openRound(2))
    api.answer.mockRejectedValueOnce(new Error('offline'))
    const { result } = await startAiming(null)
    act(() => result.current.choose('a'))
    await waitFor(() => expect(result.current.state.phase).toBe('error'))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.state.phase).toBe('aiming'))
    api.answer.mockResolvedValueOnce(ack('a'))
    act(() => result.current.choose('a'))
    await waitFor(() => expect(result.current.state.phase).toBe('locked'))
    const [first, second] = api.answer.mock.calls.map(([, , body]) => (body as { requestId: string }).requestId)
    expect(second).toBe(first)
  })

  it('turns an eliminated player into a spectator who cannot answer', async () => {
    api.current.mockResolvedValueOnce(openRound(2))
    api.answer.mockResolvedValueOnce(ack('b'))
    const { result } = await startAiming(null)
    act(() => result.current.choose('b'))
    await waitFor(() => expect(result.current.state.phase).toBe('locked'))
    api.current.mockResolvedValue(openRound(3, { player: { livesRemaining: 0, totalScore: 180, status: 'ELIMINATED' } }))
    act(() =>
      socket.emit(
        roundResult('r2', [mine({ optionId: 'b', correct: false, points: 0, livesRemaining: 0, totalScore: 180, status: 'ELIMINATED' })]),
      ),
    )
    await waitFor(() => expect(result.current.state.round?.number).toBe(3), { timeout: 3000 })
    await waitFor(() => expect(result.current.state.phase).toBe('locked'))
    expect(result.current.state.spectating).toBe(true)
    act(() => result.current.choose('a'))
    expect(api.answer).toHaveBeenCalledTimes(1)
  })

  it('updates the ranking when an opponent leaves and ends on the final ranking', async () => {
    api.current.mockResolvedValueOnce(openRound(2))
    const { result } = await startAiming(null)
    act(() => {
      socket.emit({ type: 'MEMBER_LEFT', matchId: 'm1', userId: 'lan' })
      socket.emit({ type: 'RANKING_UPDATED', matchId: 'm1', ranking: ranking([player('me', 1, 180), player('lan', 2, 180, 'FORFEITED')]) })
    })
    expect(result.current.state.ranking?.players.find((p) => p.userId === 'lan')?.status).toBe('FORFEITED')

    const final = ranking([player('me', 1, 180, 'FINISHED'), player('lan', 2, 180, 'FORFEITED')], true)
    api.result.mockResolvedValueOnce({ matchId: 'm1', endReason: 'LAST_PLAYER_STANDING', playerStatus: 'FINISHED' })
    api.ranking.mockResolvedValueOnce(final)
    act(() => {
      socket.emit(roundResult('r2', [], { matchFinished: true, endReason: 'LAST_PLAYER_STANDING', nextRoundAt: null }))
      socket.emit({ type: 'MATCH_FINISHED', matchId: 'm1', ranking: final })
      socket.emit({ type: 'ROOM_CLOSED', message: 'closed' })
    })
    await waitFor(() => expect(result.current.state.phase).toBe('finished'), { timeout: 3000 })
    expect(result.current.state.final?.endReason).toBe('LAST_PLAYER_STANDING')
    expect(result.current.state.ranking?.isFinal).toBe(true)
    expect(result.current.state.roomClosed).toBe(true)
    expect(api.result).toHaveBeenCalledTimes(1)
  })
})
