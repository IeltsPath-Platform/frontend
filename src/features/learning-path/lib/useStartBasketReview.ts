import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/toast/toastContext'
import { learningApi, toApiError, userMessage } from '../api'
import { reviewPath } from './masteryGuide'
import { reportApiError } from './reviewGate'

/**
 * Starts an optional review of one point from the basket and opens it. Only one start runs at a time, and a refusal
 * (no new set left, the point left the basket) is told as a toast so the list stays where it is.
 */
export function useStartBasketReview() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function start(knowledgePointId: string) {
    if (busyId) return
    setBusyId(knowledgePointId)
    try {
      const { reviewId } = await learningApi.startBasketReview(knowledgePointId)
      navigate(reviewPath(reviewId))
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      toast({ title: userMessage(error), tone: 'error' })
      setBusyId(null)
    }
  }

  return { busyId, start }
}
