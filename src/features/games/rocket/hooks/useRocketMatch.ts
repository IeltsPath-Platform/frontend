import { useCallback, useEffect, useRef, useState } from 'react'
import { rocketApi } from '../api/rocketApi'
import type { RocketResult, RocketRound, RocketRoundResult, RocketSoloSettings } from '../types/rocket'

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return 'Không kết nối được trò chơi. Vui lòng thử lại.'
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
    await stageRef.current?.idle()
    update({ phase: 'finished', final, round: null })
  }, [matchId, update])

  /** Fetch the current round, waiting out the reveal pause, then fly into it. */
  const enterNextRound = useCallback(
    async (afterTravel: boolean) => {
      let current = await rocketApi.current(matchId)
      if (current.matchFinished) return finish()
      let offset = Date.parse(current.serverTime) - Date.now()
      const opensIn = current.round ? Date.parse(current.round.opensAt) - (Date.now() + offset) : 0
      if (opensIn > 0) {
        await sleep(opensIn)
        current = await rocketApi.current(matchId)
        if (current.matchFinished) return finish()
        offset = Date.parse(current.serverTime) - Date.now()
      }
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
          throw error
        }
      })
    },
    [matchId, run, settleFromServer, showResult, update],
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
    void run(() => enterNextRound(false))
  }, [enterNextRound, matchId, run, stageReady])

  return { state, choose, timeUp, retry, leave }
}
