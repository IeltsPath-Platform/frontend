import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '@/lib/httpClient'
import { getSpeakingSubmission, settleSpeakingSubmission } from './speakingPracticeApi'
import type { SpeakingSubmission } from './speakingPracticeApi'

/** A grade usually lands within the first half minute, so the first polls are quick and a long wait is checked less often. */
const POLL_STEPS_MS = [4000, 4000, 4000, 4000, 4000, 8000, 8000, 8000, 15000]
const pollDelay = (polls: number) => POLL_STEPS_MS[Math.min(polls, POLL_STEPS_MS.length - 1)]
const TERMINAL = new Set(['GRADED', 'NEEDS_EXAMINER', 'ABANDONED'])

export interface SpeakingSubmissionResultState {
  submission: SpeakingSubmission | null
  /** A message for a failed load or settle that the learner can retry; empty when all is well. */
  error: string
  /** The balance fell short when the grade was released: the grade is kept and waits for a top-up. */
  short: boolean
  retry: () => void
}

/**
 * Follows a Speaking submission until it ends. When grading is done the page releases the grade itself, so the learner
 * never has to press anything: the server takes the points then, as the confirm step said it would.
 */
export function useSpeakingSubmissionResult(submissionId: string): SpeakingSubmissionResultState {
  const [submission, setSubmission] = useState<SpeakingSubmission | null>(null)
  const [error, setError] = useState('')
  const [short, setShort] = useState(false)
  const [round, setRound] = useState(0)
  const settling = useRef(false)
  const blocked = useRef(false)

  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    const controller = new AbortController()
    let polls = 0

    const settle = async () => {
      if (settling.current || blocked.current) return
      settling.current = true
      try {
        const settled = await settleSpeakingSubmission(submissionId)
        if (!stopped) { setSubmission(settled); setShort(false); setError('') }
      } catch (cause) {
        if (stopped) return
        if (cause instanceof HttpError && cause.status === 402) { blocked.current = true; setShort(true) }
        else setError(cause instanceof Error ? cause.message : 'Chưa hoàn tất được kết quả. Hãy thử lại.')
      } finally { settling.current = false }
    }

    const load = async () => {
      timer = undefined
      // A hidden tab asks nothing; coming back to it checks at once (see the visibility listener below).
      if (document.visibilityState === 'hidden') { timer = window.setTimeout(load, pollDelay(polls)); return }
      try {
        const next = await getSpeakingSubmission(submissionId, controller.signal)
        if (stopped) return
        setSubmission(next)
        setError('')
        if (next.status === 'PAYMENT_PENDING') void settle()
        // A grade waiting for a top-up does not change by itself, so polling stops until the learner retries.
        if (!TERMINAL.has(next.status) && !blocked.current) timer = window.setTimeout(load, pollDelay(polls++))
      } catch (cause) {
        if (stopped || controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : 'Không tải được trạng thái bài Speaking.')
      }
    }
    const onVisible = () => {
      // Only a poll that is waiting for its turn is brought forward; one already in flight schedules the next itself.
      if (document.visibilityState !== 'visible' || stopped || timer === undefined) return
      window.clearTimeout(timer)
      void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    void load()
    return () => {
      stopped = true
      controller.abort()
      if (timer) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [submissionId, round])

  const retry = useCallback(() => { blocked.current = false; setShort(false); setError(''); setRound((value) => value + 1) }, [])
  return { submission, error, short, retry }
}
