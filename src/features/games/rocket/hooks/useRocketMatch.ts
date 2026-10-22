import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '@/lib/httpClient'
import { gameErrorMessage } from '../../lib/gameErrorMessage'
import { rocketApi } from '../api/rocketApi'
import type { RocketCurrent, RocketResult, RocketRound, RocketRoundResult, RocketSoloSettings } from '../types/rocket'

/** What the hook asks of the 3D scene. Every step is optional so the HUD still works without WebGL. */
export type RocketStage = {
  showRound: (words: string[]) => Promise<void>
  launch: (index: number) => Promise<void>
  revealCorrect: (index: number) => Promise<void>
  revealWrong: (chosen: number | null, correct: number) => Promise<void>
  travel: () => Promise<void>
  idle: () => Promise<void>
}

export type RocketPhase = 'loading' | 'intro' | 'aiming' | 'launching' | 'reveal' | 'travel' | 'finished' | 'error'

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
}

const REVEAL_HOLD_MS = 900
const MIN_LAUNCH_MS = 650
/** Polling while a round waits to open; the server opens it on the first request after it is due. */
const MIN_OPEN_POLL_MS = 150
const MAX_OPEN_POLL_MS = 5000
const OPEN_ATTEMPTS = 40

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
}

export function useRocketMatch(matchId: string, stage: RocketStage | null, stageReady: boolean) {
  const [state, setState] = useState<RocketMatchState>(initial)
  const stateRef = useRef(state)
  const stageRef = useRef(stage)
  const alive = useRef(true)
  const busy = useRef(false)
  const pendingRequest = useRef<{ roundId: string; optionId: string; requestId: string } | null>(null)

  useEffect(() => {
    stageRef.current = stage
  }, [stage])

  const update = useCallback((patch: Partial<RocketMatchState>) => {
    if (!alive.current) return
    stateRef.current = { ...stateRef.current, ...patch }
    setState(stateRef.current)
  }, [])

  const finish = useCallback(async () => {
    const final = await rocketApi.result(matchId)
    rememberRound(matchId, null)
    await stageRef.current?.idle()
    update({ phase: 'finished', final, round: null })
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
      update({
        phase: 'intro',
        settings: current.settings,
        round,
        lives: round.player.livesRemaining,
        score: round.player.totalScore,
        chosenOptionId: null,
        reveal: null,
        clockOffsetMs: offset,
      })
      rememberRound(matchId, round)
      await stageRef.current?.showRound(round.options.map((option) => option.word))
      update({ phase: 'aiming' })
    },
    [finish, matchId, update],
  )

  const showResult = useCallback(
    async (result: RocketRoundResult) => {
      const round = stateRef.current.round
      if (!round) return
      const indexOf = (optionId: string | null) => round.options.findIndex((option) => option.optionId === optionId)
      const correct = indexOf(result.correctOptionId)
      const chosen = indexOf(result.chosenOptionId)
      update({ phase: 'reveal', reveal: result, chosenOptionId: result.chosenOptionId, lives: result.livesRemaining, score: result.totalScore })
      if (result.correct) await stageRef.current?.revealCorrect(correct)
      else await stageRef.current?.revealWrong(chosen >= 0 ? chosen : null, correct)
      await sleep(REVEAL_HOLD_MS)
      if (result.matchFinished) await finish()
      else await enterNextRound(true)
    },
    [enterNextRound, finish, update],
  )

  /** Run one step at a time; a failure leaves the round retryable instead of half-applied. */
  const run = useCallback(
    async (task: () => Promise<void>) => {
      if (busy.current) return
      busy.current = true
      try {
        await task()
      } catch (error) {
        if (alive.current && !(error instanceof DOMException && error.name === 'AbortError')) {
          update({ phase: 'error', error: errorMessage(error) })
        }
      } finally {
        busy.current = false
      }
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
   * First load. If the page left while a round's result was showing (the next round still waits out the reveal pause),
   * show that result again from the remembered round before moving on, so a reload does not hide the right answer.
   */
  const resume = useCallback(async () => {
    const current = await rocketApi.current(matchId)
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
      const { phase, round } = stateRef.current
      if (phase !== 'aiming' || !round) return
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
        } catch (error) {
          if (errorCode(error) === 'ROUND_CLOSED') return settleFromServer()
          if (errorCode(error) === 'MATCH_FINISHED') return finish()
          throw error
        }
      })
    },
    [finish, matchId, run, settleFromServer, showResult, update],
  )

  /** Called by the countdown when the deadline passes without an answer. */
  const timeUp = useCallback(() => {
    if (stateRef.current.phase !== 'aiming') return
    void run(async () => {
      update({ phase: 'launching', chosenOptionId: null })
      await settleFromServer()
    })
  }, [run, settleFromServer, update])

  const retry = useCallback(() => {
    update({ error: null, phase: 'loading' })
    void run(settleFromServer)
  }, [run, settleFromServer, update])

  const leave = useCallback(() => rocketApi.leave(matchId), [matchId])

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

  return { state, choose, timeUp, retry, leave }
}
