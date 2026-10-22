import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '@/lib/httpClient'
import { useGameConnection } from '../../hooks/useGameConnection'
import { gameErrorMessage } from '../../lib/gameErrorMessage'
import type { GameEvent, GameRanking, PlayerMode } from '../../types/game'
import { rocketApi } from '../api/rocketApi'
import type {
  RocketCurrent,
  RocketEvent,
  RocketResult,
  RocketRound,
  RocketRoundResult,
  RocketSoloSettings,
} from '../types/rocket'

/** What the hook asks of the 3D scene. Every step is optional so the HUD still works without WebGL. */
export type RocketStage = {
  showRound: (words: string[]) => Promise<void>
  launch: (index: number) => Promise<void>
  revealCorrect: (index: number) => Promise<void>
  revealWrong: (chosen: number | null, correct: number) => Promise<void>
  travel: () => Promise<void>
  idle: () => Promise<void>
}

/** `locked`: multiplayer only, answered (or watching) while the others still play the round. */
export type RocketPhase = 'loading' | 'intro' | 'aiming' | 'launching' | 'locked' | 'reveal' | 'travel' | 'finished' | 'error'

export type RocketMatchState = {
  phase: RocketPhase
  settings: RocketSoloSettings | null
  round: RocketRound | null
  lives: number
  score: number
  chosenOptionId: string | null
  reveal: RocketRoundResult | null
  final: RocketResult | null
  error: string | null
  /** serverTime − Date.now(), so countdowns follow the server clock. */
  clockOffsetMs: number
  playerMode: PlayerMode
  ownUserId: string | null
  /** Multiplayer: live ranking, final once the match has ended. */
  ranking: GameRanking | null
  /** Multiplayer: players who answered the round on screen; never what they chose. */
  answeredUserIds: string[]
  answeredCount: number | null
  aliveCount: number | null
  /** Multiplayer: out of lives (or forfeited) while the others play on; the round is watched, not answered. */
  spectating: boolean
  /** Multiplayer: the host left, so there is no lobby to return to. */
  roomClosed: boolean
}

type RoundAnswers = { roundId: string; userIds: string[]; answeredCount: number; aliveCount: number }

const REVEAL_HOLD_MS = 900
const MIN_LAUNCH_MS = 650
/** Polling while a round waits to open; the server opens it on the first request after it is due. */
const MIN_OPEN_POLL_MS = 150
const MAX_OPEN_POLL_MS = 5000
const OPEN_ATTEMPTS = 40
/** Multiplayer: polling after the deadline in case the round result event never arrives. */
const CLOSE_POLL_MS = 700
const CLOSE_ATTEMPTS = 12

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))

function errorMessage(error: unknown) {
  if (error instanceof HttpError && error.isNetworkError) return 'Mất kết nối tới máy chủ. Vui lòng thử lại.'
  return gameErrorMessage(error)
}

/**
 * The round on screen, kept per tab so a reload during the reveal can show it again: the server's lastRoundResult
 * names the options by id only. Storage may be unavailable; the reveal is then skipped, nothing else changes.
 */
const roundKey = (matchId: string) => `rocket:round:${matchId}`

function rememberRound(matchId: string, round: RocketRound | null) {
  try {
    if (round) sessionStorage.setItem(roundKey(matchId), JSON.stringify(round))
    else sessionStorage.removeItem(roundKey(matchId))
  } catch {
    // Private mode or blocked storage.
  }
}

function recallRound(matchId: string): RocketRound | null {
  try {
    const raw = sessionStorage.getItem(roundKey(matchId))
    return raw ? (JSON.parse(raw) as RocketRound) : null
  } catch {
    return null
  }
}

function errorCode(error: unknown) {
  return typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : null
}

/** Codes after which a multiplayer answer is settled by reading the round again rather than shown as an error. */
const RESYNC_CODES = new Set(['ROUND_CLOSED', 'ALREADY_ANSWERED', 'PLAYER_NOT_ACTIVE'])

const initial: RocketMatchState = {
  phase: 'loading',
  settings: null,
  round: null,
  lives: 0,
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
}

/**
 * Solo and multiplayer Rocket share the round model. Solo moves on from each answer's result; multiplayer also
 * listens to the room socket (round results, answered marks, ranking) and resyncs with `rounds/current` on every
 * (re)connect. Events about a round other than the one on screen are ignored, so duplicates and late arrivals are harmless.
 */
export function useRocketMatch(matchId: string, stage: RocketStage | null, stageReady: boolean) {
  const [state, setState] = useState<RocketMatchState>(initial)
  const [roomId, setRoomId] = useState<string | null>(null)
  const stateRef = useRef(state)
  const stageRef = useRef(stage)
  const alive = useRef(true)
  const busy = useRef(false)
  /** Socket work that arrived while another step ran, done in arrival order afterwards. */
  const queue = useRef<Array<() => Promise<void>>>([])
  const pendingRequest = useRef<{ roundId: string; optionId: string; requestId: string } | null>(null)
  const revealedRound = useRef<string | null>(null)
  /** Answered marks for a round not on screen yet (the socket can be ahead of the opening poll). */
  const earlyAnswers = useRef<RoundAnswers | null>(null)

  useEffect(() => {
    stageRef.current = stage
  }, [stage])

  const update = useCallback((patch: Partial<RocketMatchState>) => {
    if (!alive.current) return
    stateRef.current = { ...stateRef.current, ...patch }
    setState(stateRef.current)
  }, [])

  const multiplayer = () => stateRef.current.playerMode === 'MULTIPLAYER'

  const finish = useCallback(async () => {
    if (stateRef.current.phase === 'finished') return
    const [final, ranking] = await Promise.all([
      rocketApi.result(matchId),
      multiplayer() ? rocketApi.ranking(matchId).catch(() => null) : Promise.resolve(null),
    ])
    rememberRound(matchId, null)
    await stageRef.current?.idle()
    update({ phase: 'finished', final, round: null, ...(ranking ? { ranking } : {}) })
  }, [matchId, update])

  /** Fetch the current round, waiting out the reveal pause, then fly into it. */
  const enterNextRound = useCallback(
    async (afterTravel: boolean, fetched?: RocketCurrent) => {
      let current = fetched ?? (await rocketApi.current(matchId))
      // A round in its reveal pause has no deadline yet: wait until it is due to open, then ask again.
      for (let attempt = 0; current.round && !current.round.deadlineAt && !current.matchFinished; attempt += 1) {
        if (attempt >= OPEN_ATTEMPTS) throw new Error('Câu tiếp theo chưa mở được. Vui lòng thử lại.')
        const skew = Date.parse(current.serverTime) - Date.now()
        const opensAt = current.round.opensAt ? Date.parse(current.round.opensAt) : Date.now() + skew
        await sleep(Math.min(Math.max(opensAt - (Date.now() + skew), MIN_OPEN_POLL_MS), MAX_OPEN_POLL_MS))
        if (!alive.current) return
        current = await rocketApi.current(matchId)
      }
      if (current.matchFinished) return finish()
      const offset = Date.parse(current.serverTime) - Date.now()
      const round = current.round
      if (!round || !alive.current) return
      if (afterTravel) {
        update({ phase: 'travel' })
        await stageRef.current?.travel()
      }
      const early = earlyAnswers.current?.roundId === round.roundId ? earlyAnswers.current : null
      earlyAnswers.current = null
      const spectating = round.player.status !== 'ACTIVE'
      update({
        phase: 'intro',
        settings: current.settings,
        round,
        lives: round.player.livesRemaining,
        score: round.player.totalScore,
        chosenOptionId: round.me.answered ? round.me.optionId : null,
        reveal: null,
        clockOffsetMs: offset,
        answeredUserIds: early?.userIds ?? [],
        answeredCount: early?.answeredCount ?? null,
        aliveCount: early?.aliveCount ?? null,
        spectating,
      })
      rememberRound(matchId, round)
      await stageRef.current?.showRound(round.options.map((option) => option.word))
      // A reload after answering keeps the answer; a spectator only watches.
      update({ phase: round.me.answered || spectating ? 'locked' : 'aiming' })
    },
    [finish, matchId, update],
  )

  const showResult = useCallback(
    async (result: RocketRoundResult) => {
      const round = stateRef.current.round
      if (!round || round.roundId !== result.roundId || revealedRound.current === result.roundId) return
      revealedRound.current = result.roundId
      const watching = stateRef.current.spectating
      const indexOf = (optionId: string | null) => round.options.findIndex((option) => option.optionId === optionId)
      const correct = indexOf(result.correctOptionId)
      const chosen = indexOf(result.chosenOptionId)
      update({ phase: 'reveal', reveal: result, chosenOptionId: result.chosenOptionId, lives: result.livesRemaining, score: result.totalScore })
      if (result.correct && !watching) await stageRef.current?.revealCorrect(correct)
      else await stageRef.current?.revealWrong(chosen >= 0 ? chosen : null, correct)
      await sleep(REVEAL_HOLD_MS)
      // Multiplayer goes on without a player who ran out of lives; they watch the remaining rounds.
      if (result.status !== 'ACTIVE' && multiplayer()) update({ spectating: true })
      if (result.matchFinished) await finish()
      else await enterNextRound(true)
    },
    [enterNextRound, finish, update],
  )

  /** Run one step at a time; a failure leaves the round retryable instead of half-applied. */
  const run = useCallback(
    async (task: () => Promise<void>, queueIfBusy = false) => {
      if (busy.current) {
        if (queueIfBusy) queue.current.push(task)
        return
      }
      busy.current = true
      for (let next: (() => Promise<void>) | undefined = task; next && alive.current; next = queue.current.shift()) {
        try {
          await next()
        } catch (error) {
          if (alive.current && !(error instanceof DOMException && error.name === 'AbortError')) {
            queue.current = []
            update({ phase: 'error', error: errorMessage(error) })
          }
        }
      }
      busy.current = false
    },
    [update],
  )

  const settleFromServer = useCallback(async () => {
    const round = stateRef.current.round
    const current = await rocketApi.current(matchId)
    const last = current.lastRoundResult
    if (round && last && last.roundId === round.roundId) return showResult(last)
    if (current.matchFinished) return finish()
    return enterNextRound(false)
  }, [enterNextRound, finish, matchId, showResult])

  /**
   * Multiplayer: bring the screen in line with the server. Returns true while the round on screen is still open,
   * so a caller waiting for it to close can ask again.
   */
  const resync = useCallback(
    async (fetched?: RocketCurrent): Promise<boolean> => {
      if (stateRef.current.phase === 'finished') return false
      const current = fetched ?? (await rocketApi.current(matchId))
      const round = stateRef.current.round
      const last = current.lastRoundResult
      if (round && last && last.roundId === round.roundId && revealedRound.current !== round.roundId) {
        await showResult(last)
        return false
      }
      if (current.matchFinished) {
        await finish()
        return false
      }
      if (round && current.round?.roundId === round.roundId) {
        const { player, me, deadlineAt } = current.round
        const offset = Date.parse(current.serverTime) - Date.now()
        const expired = deadlineAt !== null && Date.now() + offset >= Date.parse(deadlineAt)
        // The server decides whether this player may still answer; an unanswered round stays answerable (same requestId).
        const locked = me.answered || player.status !== 'ACTIVE' || expired
        update({
          lives: player.livesRemaining,
          score: player.totalScore,
          spectating: player.status !== 'ACTIVE',
          clockOffsetMs: offset,
          phase: locked ? 'locked' : 'aiming',
          chosenOptionId: me.answered ? me.optionId : locked ? stateRef.current.chosenOptionId : null,
          error: null,
        })
        return true
      }
      // A different round (or none on screen yet): go on to it.
      await enterNextRound(false, current)
      return false
    },
    [enterNextRound, finish, matchId, showResult, update],
  )

  /** Multiplayer: the deadline passed; wait for the round to close if its result event does not come. */
  const awaitClose = useCallback(async () => {
    for (let attempt = 0; attempt < CLOSE_ATTEMPTS; attempt += 1) {
      const round = stateRef.current.round
      if (!round || revealedRound.current === round.roundId || !alive.current) return
      if (!(await resync())) return
      await sleep(CLOSE_POLL_MS)
    }
  }, [resync])

  /**
   * First load. If the page left while a round's result was showing (the next round still waits out the reveal pause),
   * show that result again from the remembered round before moving on, so a reload does not hide the right answer.
   */
  const resume = useCallback(async () => {
    const [current, info] = await Promise.all([rocketApi.current(matchId), rocketApi.match(matchId).catch(() => null)])
    if (info?.playerMode === 'MULTIPLAYER') {
      update({ playerMode: 'MULTIPLAYER', ownUserId: info.ownUserId, ranking: info.ranking })
      setRoomId(info.roomId)
    }
    const last = current.lastRoundResult
    const seen = recallRound(matchId)
    const inPause = !current.matchFinished && current.round !== null && !current.round.deadlineAt
    if (inPause && last && seen && seen.roundId === last.roundId) {
      update({
        phase: 'intro',
        settings: current.settings,
        round: seen,
        lives: seen.player.livesRemaining,
        score: seen.player.totalScore,
        spectating: seen.player.status !== 'ACTIVE',
        clockOffsetMs: Date.parse(current.serverTime) - Date.now(),
      })
      await stageRef.current?.showRound(seen.options.map((option) => option.word))
      return showResult(last)
    }
    if (current.matchFinished) return finish()
    return enterNextRound(false, current)
  }, [enterNextRound, finish, matchId, showResult, update])

  const choose = useCallback(
    (optionId: string) => {
      const { phase, round, spectating } = stateRef.current
      if (phase !== 'aiming' || !round || spectating) return
      const index = round.options.findIndex((option) => option.optionId === optionId)
      if (index < 0) return
      void run(async () => {
        update({ phase: 'launching', chosenOptionId: optionId, error: null })
        const previous = pendingRequest.current
        const requestId =
          previous && previous.roundId === round.roundId && previous.optionId === optionId ? previous.requestId : crypto.randomUUID()
        pendingRequest.current = { roundId: round.roundId, optionId, requestId }
        try {
          const [ack] = await Promise.all([
            rocketApi.answer(matchId, round.roundId, { requestId, optionId }),
            stageRef.current?.launch(index) ?? sleep(MIN_LAUNCH_MS),
          ])
          pendingRequest.current = null
          if (ack.roundResult) await showResult(ack.roundResult)
          // Multiplayer: the others are still answering; the result arrives on the socket.
          else if (revealedRound.current !== round.roundId) update({ phase: 'locked' })
        } catch (error) {
          const code = errorCode(error)
          if (multiplayer() && code && RESYNC_CODES.has(code)) {
            pendingRequest.current = null
            if (stateRef.current.phase === 'launching') update({ phase: 'locked' })
            return void (await resync())
          }
          if (code === 'ROUND_CLOSED') return settleFromServer()
          if (code === 'MATCH_FINISHED') return finish()
          throw error
        }
      })
    },
    [finish, matchId, resync, run, settleFromServer, showResult, update],
  )

  /** Called by the countdown when the deadline passes; multiplayer also while answered or watching. */
  const timeUp = useCallback(() => {
    const { phase } = stateRef.current
    if (multiplayer()) {
      if (phase !== 'aiming' && phase !== 'locked') return
      void run(async () => {
        update({ phase: 'locked' })
        await awaitClose()
      }, true)
      return
    }
    if (phase !== 'aiming') return
    void run(async () => {
      update({ phase: 'launching', chosenOptionId: null })
      await settleFromServer()
    })
  }, [awaitClose, run, settleFromServer, update])

  const retry = useCallback(() => {
    update({ error: null, phase: 'loading' })
    void run(multiplayer() ? async () => void (await resync()) : settleFromServer)
  }, [resync, run, settleFromServer, update])

  const leave = useCallback(() => rocketApi.leave(matchId), [matchId])

  const onEvent = useCallback(
    (raw: GameEvent) => {
      const event = raw as unknown as RocketEvent
      if (event.matchId && event.matchId !== matchId) return
      const onScreen = stateRef.current.round?.roundId
      switch (event.type) {
        case 'ROCKET_ROUND_STARTED': {
          const number = event.round.number
          void run(async () => {
            const { phase, round } = stateRef.current
            if (phase === 'finished' || (round && round.number >= number)) return
            await enterNextRound(false)
          }, true)
          return
        }
        case 'ROCKET_PLAYER_ANSWERED': {
          const known = event.roundId === onScreen ? stateRef.current.answeredUserIds : earlyAnswers.current?.roundId === event.roundId ? earlyAnswers.current.userIds : []
          const answers: RoundAnswers = {
            roundId: event.roundId,
            userIds: known.includes(event.userId) ? known : [...known, event.userId],
            answeredCount: event.answeredCount,
            aliveCount: event.aliveCount,
          }
          if (event.roundId === onScreen)
            update({ answeredUserIds: answers.userIds, answeredCount: answers.answeredCount, aliveCount: answers.aliveCount })
          else if (revealedRound.current !== event.roundId) earlyAnswers.current = answers
          return
        }
        case 'ROCKET_ROUND_RESULT': {
          if (event.roundId !== onScreen) return
          if (event.ranking) update({ ranking: event.ranking })
          if (revealedRound.current === event.roundId) return
          const { ownUserId, lives, score, round } = stateRef.current
          const mine = event.answers.find((answer) => answer.userId === ownUserId)
          const result: RocketRoundResult = {
            roundId: event.roundId,
            correctOptionId: event.correctOptionId,
            chosenOptionId: mine?.optionId ?? null,
            correct: mine?.correct ?? false,
            points: mine?.points ?? 0,
            livesRemaining: mine?.livesRemaining ?? lives,
            totalScore: mine?.totalScore ?? score,
            status: mine?.status ?? round?.player.status ?? 'ACTIVE',
            nextRoundAt: event.nextRoundAt,
            matchFinished: event.matchFinished,
            endReason: event.endReason,
          }
          void run(() => showResult(result), true)
          return
        }
        case 'RANKING_UPDATED':
        case 'MEMBER_LEFT':
          if (event.ranking && stateRef.current.phase !== 'finished') update({ ranking: event.ranking })
          return
        case 'MATCH_FINISHED':
          if (event.ranking) update({ ranking: event.ranking })
          void run(finish, true)
          return
        case 'ROOM_CLOSED':
          update({ roomClosed: true })
          return
      }
    },
    [enterNextRound, finish, matchId, run, showResult, update],
  )

  const connected = useGameConnection(roomId, onEvent, matchId)

  // Every (re)connect may have missed events: read the round and the ranking again.
  useEffect(() => {
    if (!connected) return
    void run(async () => {
      if (stateRef.current.phase === 'finished' || stateRef.current.phase === 'loading') return
      const [current, ranking] = await Promise.all([rocketApi.current(matchId), rocketApi.ranking(matchId).catch(() => null)])
      if (ranking) update({ ranking })
      await resync(current)
    }, true)
  }, [connected, matchId, resync, run, update])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (!stageReady || !matchId) return
    void run(resume)
  }, [matchId, resume, run, stageReady])

  return { state, choose, timeUp, retry, leave, connected, roomId }
}
