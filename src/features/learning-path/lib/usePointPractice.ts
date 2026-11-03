import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TreePoint } from '~types/learningPath'
import { learningApi, toApiError, type ApiError } from '../api'
import { freePracticePath, type FreePracticeNavigationState } from './routes'
import { reportApiError } from './reviewGate'

/** Starts free practice on one knowledge point; the button and the feedback below it share this state. */
export function usePointPractice(point: TreePoint, { backTo, depleted, onHeartsChanged }: {
  backTo: string
  depleted: boolean
  onHeartsChanged: () => void
}) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [failure, setFailure] = useState<ApiError | null>(null)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const inFlight = useRef(false)

  async function practise() {
    if (inFlight.current) return
    inFlight.current = true
    setStarting(true)
    setFailure(null)
    try {
      const attempt = await learningApi.startFreePractice(point.knowledgePointId)
      navigate(freePracticePath(attempt.attemptId), {
        state: { freePractice: { pointName: point.name, pointCode: point.code, backTo } } satisfies FreePracticeNavigationState,
      })
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      if (error.code === 'PAYWALL') { setUnlockOpen(true); inFlight.current = false; setStarting(false); return }
      setFailure(error)
      if (error.code === 'HEARTS_DEPLETED') onHeartsChanged()
      inFlight.current = false
      setStarting(false)
    }
  }

  return { starting, failure, unlockOpen, setUnlockOpen, practise, depleted }
}
export type PointPractice = ReturnType<typeof usePointPractice>

/** Why practice may be unavailable, or how much the learner has done; one sentence, shared by the row and the panel. */
export function practiceNote(point: TreePoint, depleted: boolean) {
  if (depleted) return 'Hết tim, hồi tim để luyện.'
  if (!point.locked && !point.practiceAvailable) return 'Đã hết bộ luyện tự do, các bộ còn lại dành cho bài ôn.'
  return point.evidenceCount > 0 ? `${point.evidenceCount} lượt làm` : 'Chưa làm lượt nào'
}
