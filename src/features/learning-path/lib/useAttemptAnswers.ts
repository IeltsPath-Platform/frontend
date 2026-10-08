import { useEffect, useRef, useState } from 'react'
import type { AnswerMap, AttemptItemResponse } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { reportApiError } from './reviewGate'

export type SaveState = 'saving' | 'saved' | 'error'

/** The `answer` a response payload carries (`{"answer": ...}`), or null for any other shape. */
function answerOf(payload: string): string | null {
  try {
    const value = JSON.parse(payload) as { answer?: unknown }
    return typeof value?.answer === 'string' ? value.answer : null
  } catch {
    return null
  }
}

/**
 * Keeps the answers of one attempt and saves each item through the revisioned `PUT .../response`.
 * Saves of one item run in order, an unchanged value is not sent again, and a failed save is reported
 * per item so the caller can retry it when submitting.
 *
 * `saved` are the responses the server already holds (GET .../responses); a resumed attempt starts from them and
 * sends their revisions, so its next save does not conflict.
 */
export function useAttemptAnswers(attemptId: string, saved: AttemptItemResponse[] = []) {
  const [initial] = useState(() => {
    const answers: AnswerMap = {}
    const revisions: Record<string, number> = {}
    for (const response of saved) {
      revisions[response.attemptItemId] = response.revision
      const answer = answerOf(response.payload)
      if (answer !== null) answers[response.attemptItemId] = answer
    }
    return { answers, revisions }
  })
  const [answers, setAnswers] = useState<AnswerMap>(initial.answers)
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})
  const savedValues = useRef<AnswerMap>({ ...initial.answers })
  const revisions = useRef<Record<string, number>>({ ...initial.revisions })
  const queues = useRef<Record<string, Promise<boolean>>>({})
  const mounted = useRef(true)

  // Strict Mode re-runs cleanup and setup on the same instance, so reset the flag on setup.
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  function saveAnswer(itemId: string, rawValue: string): Promise<boolean> {
    const value = rawValue.trim()
    const run = async () => {
      if (!value || savedValues.current[itemId] === value) return true
      if (mounted.current) setSaveStates((current) => ({ ...current, [itemId]: 'saving' }))
      try {
        const response = await learningApi.saveItemResponse(attemptId, itemId, {
          payload: JSON.stringify({ answer: value }),
          schemaVersion: 1,
          expectedRevision: revisions.current[itemId] ?? 0,
        })
        revisions.current[itemId] = response.revision
        savedValues.current[itemId] = value
        if (mounted.current) setSaveStates((current) => ({ ...current, [itemId]: 'saved' }))
        return true
      } catch (reason) {
        reportApiError(toApiError(reason))
        if (mounted.current) setSaveStates((current) => ({ ...current, [itemId]: 'error' }))
        return false
      }
    }
    const next = (queues.current[itemId] ?? Promise.resolve(true)).then(run)
    queues.current[itemId] = next
    return next
  }

  function setAnswer(itemId: string, value: string) {
    setAnswers((current) => ({ ...current, [itemId]: value }))
  }

  return { answers, saveStates, saveAnswer, setAnswer, isMounted: () => mounted.current }
}
