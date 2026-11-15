import { useRef, useState } from 'react'
import { learningApi, toApiError, userMessage } from '../api'
import { newRequestId } from './requestId'

/**
 * Buys a full refill of hearts with points. The panel on the progress page and the popup of the owl share it.
 * `onRefilled` runs when the hearts are full again, including when they already were.
 */
export function useHeartsRefill({ refillCost, onRefilled }: { refillCost: number | null; onRefilled: () => void }) {
  const [refilling, setRefilling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // One id per refill intent: a retry after a dropped connection reuses it, so Access charges the points once.
  const requestId = useRef<string | null>(null)

  async function refill() {
    if (refilling) return
    setRefilling(true)
    setError(null)
    requestId.current ??= newRequestId()
    try {
      await learningApi.refillHearts(requestId.current)
      requestId.current = null
      onRefilled()
    } catch (reason) {
      const apiError = toApiError(reason)
      if (apiError.code === 'HEARTS_FULL') {
        requestId.current = null
        onRefilled()
      } else if (apiError.code === 'INSUFFICIENT_POINTS') {
        requestId.current = null
        setError(refillCost === null
          ? 'Bạn chưa đủ điểm để hồi đầy tim.'
          : `Bạn cần ${refillCost} điểm để hồi đầy tim nhưng chưa đủ điểm.`)
      } else {
        setError(userMessage(apiError))
      }
    } finally {
      setRefilling(false)
    }
  }

  return { refilling, error, refill }
}
