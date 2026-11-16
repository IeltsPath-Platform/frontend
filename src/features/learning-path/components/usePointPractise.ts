import { useEffect, useRef, useState } from 'react'
import type { EssayStudyPoint } from '~types/learningPath'
import { toApiError, userMessage } from '../api'

export type Practise = (point: EssayStudyPoint) => Promise<void>

/**
 * Starts practice on a study point once at a time. While it opens the button stays disabled; a refusal is kept as a
 * message for that point alone and the button works again, so the learner can retry. Success leaves the page, so the
 * state is not reset then.
 */
export function usePointPractise(point: EssayStudyPoint, onPractise?: Practise) {
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  async function practise() {
    if (!onPractise || inFlight.current) return
    inFlight.current = true
    setOpening(true)
    setError(null)
    try {
      await onPractise(point)
    } catch (reason) {
      inFlight.current = false
      if (mounted.current) {
        setOpening(false)
        setError(userMessage(toApiError(reason)))
      }
    }
  }

  return { opening, error, practise }
}
