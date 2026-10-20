import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/toast/toastContext'
import { HttpError } from '@/lib/httpClient'
import { gameErrorMessage } from '../lib/gameErrorMessage'
import { gameApi } from '../api/gameApi'
import type {
  CurrentWord,
  GameRoom,
  GameMatch,
  GameRanking,
  GuessInput,
  GuessResponse,
  HintResponse,
} from '../types/game'
import { useGameConnection } from './useGameConnection'
import { rememberMatchHost, recalledMatchHost } from '../lib/matchRoomContext'

export function useWordlyMatch(matchId: string) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [word, setWord] = useState<CurrentWord | null>(null)
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [match, setMatch] = useState<GameMatch | null>(null)
  const [ranking, setRanking] = useState<GameRanking | null>(null)
  const [closedMessage, setClosedMessage] = useState('')
  const [syncTick, setSyncTick] = useState(0)
  const finalSeen = useRef(false)
  const roomSnapshot = useRef<GameRoom | null>(null)
  const closure = useRef('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<GuessInput | null>(null)
  const [feedback, setFeedback] = useState<GuessResponse | null>(null)
  const [revealing, setRevealing] = useState<{
    wordId: string
    attempt: number
  } | null>(null)
  const animationWait = useRef<{
    timer: ReturnType<typeof setTimeout>
    resolve: () => void
  } | null>(null)
  useEffect(
    () => () => {
      if (animationWait.current) {
        clearTimeout(animationWait.current.timer)
        animationWait.current.resolve()
      }
    },
    [],
  )
  const [hint, setHint] = useState<HintResponse | null>(null)
  const alive = useRef(false)
  const mutating = useRef(false)
  const hintRequest = useRef<{ wordId: string; requestId: string } | null>(null)
  const version = useRef(0)
  const refreshSequence = useRef(0)
  const refreshing = useRef(false)
  const refreshQueued = useRef(false)
  const refreshLatest = useRef<(() => Promise<void>) | null>(null)
  const finish = useCallback(
    () =>
      navigate(`/games/matches/${matchId}/result`, {
        replace: true,
        state: {
          hostUserId:
            roomSnapshot.current?.hostUserId ?? recalledMatchHost(matchId),
          closedMessage: closure.current,
        },
      }),
    [matchId, navigate],
  )
  const refresh = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (refreshing.current) {
        refreshQueued.current = true
        return
      }
      refreshing.current = true
      const requestVersion = version.current
      const sequence = ++refreshSequence.current
      try {
        const snapshot = await gameApi.match(matchId, signal)
        if (
          !alive.current ||
          signal?.aborted ||
          requestVersion !== version.current ||
          sequence !== refreshSequence.current
        )
          return
        setMatch(snapshot)
        if (snapshot.ranking) setRanking(snapshot.ranking)
        if (snapshot.status === 'COMPLETED') {
          finalSeen.current = true
          finish()
          return
        }
        if (
          snapshot.playerMode === 'MULTIPLAYER' &&
          snapshot.ownPlayer &&
          !['ACTIVE', 'DISCONNECTED'].includes(snapshot.ownPlayer.status)
        ) {
          setWord(null)
          setHint(null)
          setError(null)
          return
        }
        const current = await gameApi.current(matchId, signal)
        if (
          alive.current &&
          !signal?.aborted &&
          requestVersion === version.current &&
          sequence === refreshSequence.current
        ) {
          setWord(current)
          setHint(current.hint)
          setError(null)
        }
      } catch (reason) {
        if (
          !alive.current ||
          signal?.aborted ||
          requestVersion !== version.current ||
          sequence !== refreshSequence.current
        )
          return
        if (
          reason instanceof HttpError &&
          reason.code === 'PLAYER_NOT_ACTIVE'
        ) {
          setWord(null)
          setHint(null)
          setError(null)
          return
        }
        if (
          reason instanceof HttpError &&
          (reason.status === 404 || reason.code === 'MATCH_FINISHED')
        ) {
          try {
            await gameApi.result(matchId, signal)
            if (
              alive.current &&
              !signal?.aborted &&
              sequence === refreshSequence.current &&
              requestVersion === version.current
            )
              finish()
            return
          } catch {
            /* Preserve the original ownership/current-word error. */
          }
        }
        setError(gameErrorMessage(reason))
      } finally {
        refreshing.current = false
        if (refreshQueued.current && alive.current && !mutating.current) {
          refreshQueued.current = false
          void refreshLatest.current?.()
        }
      }
    },
    [matchId, finish],
  )
  useEffect(() => {
    refreshLatest.current = refresh
  }, [refresh])
  useEffect(() => {
    alive.current = true
    const controller = new AbortController()
    const load = async () => {
      try {
        const match = await gameApi.match(matchId, controller.signal)
        if (!controller.signal.aborted) setMatch(match)
        if (match.status === 'COMPLETED') {
          if (!controller.signal.aborted) finish()
          return
        }
        try {
          const currentRoom = await gameApi.room(
            match.roomId,
            controller.signal,
          )
          if (!controller.signal.aborted) {
            setRoom(currentRoom)
            roomSnapshot.current = currentRoom
            rememberMatchHost(matchId, currentRoom.hostUserId)
          }
        } catch (reason) {
          if (match.playerMode !== 'MULTIPLAYER') throw reason
        }
        await refresh(controller.signal)
      } catch (reason) {
        if (!controller.signal.aborted) setError(gameErrorMessage(reason))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => {
      alive.current = false
      controller.abort()
    }
  }, [matchId, refresh, finish])
  useEffect(() => {
    if (!match?.roomId) return
    const controller = new AbortController()
    const sync = () => {
      if (!mutating.current && document.visibilityState === 'visible')
        void refresh(controller.signal)
    }
    const timer = window.setInterval(sync, 2500)
    window.addEventListener('focus', sync)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', sync)
    }
  }, [refresh, match?.roomId])
  const connected = useGameConnection(
    match?.playerMode === 'MULTIPLAYER' ? match.roomId : null,
    (event) => {
      if (event.matchId && event.matchId !== matchId) return
      if (event.type === 'ROOM_CLOSED') {
        closure.current = event.message || 'Chủ phòng đã đóng phòng.'
        setClosedMessage(closure.current)
      }
      if (event.type === 'MEMBER_LEFT' && event.message)
        toast({ title: event.message, tone: 'info' })
      if (event.type === 'MATCH_FINISHED') finalSeen.current = true
      if (
        [
          'CONNECTED',
          'MATCH_STATE',
          'WORD_STATE',
          'RANKING_UPDATED',
          'MATCH_FINISHED',
          'ROOM_CLOSED',
        ].includes(event.type)
      ) {
        version.current += 1
        if (event.ranking) setRanking(event.ranking)
        setSyncTick((value) => value + 1)
      }
    },
    matchId,
  )
  useEffect(() => {
    if (!match?.roomId || mutating.current) return
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [syncTick, match?.roomId, refresh])
  async function submit(input: string) {
    if (!word || mutating.current) return
    const body = pending ?? {
      requestId: crypto.randomUUID(),
      playerWordId: word.playerWordId,
      guess: input.trim().toUpperCase(),
    }
    mutating.current = true
    version.current++
    setBusy(true)
    setPending(body)
    setError(null)
    try {
      const result = await gameApi.guess(matchId, body)
      if (!alive.current) return
      if ('code' in result && result.code === 'REQUEST_PENDING') {
        toast({ title: 'Lượt đoán đang được xử lý. Bấm thử lại để nhận kết quả.', tone: 'info' })
        return
      }
      if (!('wordStatus' in result))
        throw new Error('Phản hồi lượt đoán không hợp lệ.')
      setPending(null)
      setFeedback(result)
      if (
        word.playerWordId === result.playerWordId &&
        !word.guesses.some(
          (guess) => guess.attemptNumber === result.attemptsUsed,
        )
      ) {
        setRevealing({
          wordId: result.playerWordId,
          attempt: result.attemptsUsed,
        })
        setWord({
          ...word,
          attemptsUsed: result.attemptsUsed,
          guesses: [
            ...word.guesses,
            {
              attemptNumber: result.attemptsUsed,
              guess: result.guess,
              letters: result.letters,
            },
          ],
        })
        const reduced = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches
        await new Promise<void>((resolve) => {
          animationWait.current = {
            resolve,
            timer: setTimeout(
              resolve,
              reduced
                ? 100
                : 480 +
                    (word.columns - 1) * 140 +
                    (result.wordStatus === 'ACTIVE' ? 150 : 650),
            ),
          }
        })
        animationWait.current = null
        if (!alive.current) return
        setRevealing(null)
      }
      if (result.matchFinished || finalSeen.current) {
        finish()
        return
      }
      if (result.nextWord) {
        setWord(result.nextWord)
        setHint(result.nextWord.hint)
        toast(
          result.wordStatus === 'SOLVED'
            ? { title: `Đúng! +${result.points.total} điểm. Đã chuyển sang từ tiếp theo.`, tone: 'success' }
            : { title: 'Đã hết lượt đoán. Mất 1 mạng và chuyển từ tiếp theo.', tone: 'info' },
        )
      }
      await refresh()
    } catch (reason) {
      if (!alive.current) return
      if (
        reason instanceof HttpError &&
        reason.status > 0 &&
        reason.status < 500
      ) {
        setPending(null)
        if (reason.status === 409) await refresh()
      }
      if (reason instanceof HttpError && reason.code === 'WORD_NOT_FOUND')
        toast({ title: 'Từ không tồn tại', tone: 'error' })
      else setError(gameErrorMessage(reason))
    } finally {
      mutating.current = false
      if (alive.current) setBusy(false)
    }
  }
  async function revealHint() {
    if (!word || mutating.current || word.hint || pending) return
    if (hintRequest.current?.wordId !== word.playerWordId)
      hintRequest.current = {
        wordId: word.playerWordId,
        requestId: crypto.randomUUID(),
      }
    mutating.current = true
    version.current++
    setBusy(true)
    setError(null)
    try {
      const response = await gameApi.hint(
        matchId,
        word.playerWordId,
        hintRequest.current.requestId,
      )
      if (alive.current) {
        setHint(response)
        await refresh()
      }
    } catch (reason) {
      if (alive.current) setError(gameErrorMessage(reason))
      if (reason instanceof HttpError && reason.status === 409) await refresh()
    } finally {
      mutating.current = false
      if (alive.current) setBusy(false)
    }
  }
  async function leave() {
    if (mutating.current) return
    mutating.current = true
    version.current++
    setBusy(true)
    setError(null)
    try {
      const response = await gameApi.leaveMatch(matchId)
      if (alive.current) {
        if (response.resultAvailable) finish()
        else {
          setWord(null)
          setHint(null)
          await refresh()
        }
      }
    } catch (reason) {
      if (alive.current) setError(gameErrorMessage(reason))
    } finally {
      mutating.current = false
      if (alive.current) setBusy(false)
    }
  }
  const ownPlayer =
    ranking?.players.find(
      (player) => player.userId === match?.ownPlayer?.userId,
    ) ?? match?.ownPlayer
  return {
    connected,
    ranking,
    ownPlayer,
    match,
    closedMessage,
    revealing,
    word,
    room,
    loading,
    error,
    busy,
    pending,
    feedback,
    hint,
    submit,
    revealHint,
    leave,
    refresh,
  }
}
