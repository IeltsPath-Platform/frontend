import { useCallback, useRef, useState } from 'react'
import { learningApi, toApiError, userMessage } from '../api'
import { newRequestId } from './requestId'

/**
 * Buys a streak freeze with points. One request id per purchase: a retry after a dropped connection reuses it, so
 * Access charges the points once. `onBought` runs when the learner now owns the freeze, including when it was already
 * owned (an earlier try whose answer was lost), so the caller shows the current state.
 */
export function useBuyStreakFreeze(onBought: () => void) {
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef<string | null>(null)

  const buy = useCallback(async () => {
    if (buying) return
    setBuying(true)
    setError(null)
    requestId.current ??= newRequestId()
    try {
      await learningApi.buyStreakFreeze(requestId.current)
      requestId.current = null
      onBought()
    } catch (reason) {
      const apiError = toApiError(reason)
      if (apiError.code === 'FREEZE_ALREADY_OWNED') {
        requestId.current = null
        onBought()
      } else if (apiError.code === 'ACCESS_UNAVAILABLE' || apiError.code === 'SERVER_ERROR') {
        // Nothing was charged for this id as far as we know, so keep it for the retry.
        setError(userMessage(apiError))
      } else {
        requestId.current = null
        setError(userMessage(apiError))
      }
    } finally {
      setBuying(false)
    }
  }, [buying, onBought])

  return { buy, buying, error }
}
