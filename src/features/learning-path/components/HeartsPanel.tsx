import { useEffect, useRef, useState } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { HeartsStatus } from '~types/learningPath'
import { learningApi, toApiError, userMessage } from '../api'
import { formatWait } from '../lib/formatWait'
import { newRequestId } from '../lib/requestId'

/**
 * The learner's hearts: how many are left, when the next one returns and, below the maximum, a refill for points.
 * With no hearts left it says so, since starting or submitting a set is refused until one returns.
 */
export function HeartsPanel({ status, onChanged }: { status: HeartsStatus; onChanged: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  const [refilling, setRefilling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // One id per refill intent: a retry after a dropped connection reuses it, so Access charges the points once.
  const requestId = useRef<string | null>(null)
  const expired = useRef(false)

  const depleted = status.hearts === 0
  const full = status.hearts >= status.maxHearts
  const waitMs = status.nextHeartAt ? new Date(status.nextHeartAt).getTime() - now : null

  useEffect(() => {
    if (full) return undefined
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [full])

  // The clock has run out: the server has a new heart for us, so ask again, once per deadline.
  useEffect(() => {
    if (waitMs !== null && waitMs <= 0 && !expired.current) {
      expired.current = true
      onChanged()
    }
    if (waitMs === null || waitMs > 0) expired.current = false
  }, [waitMs, onChanged])

  async function refill() {
    if (refilling) return
    setRefilling(true)
    setError(null)
    requestId.current ??= newRequestId()
    try {
      await learningApi.refillHearts(requestId.current)
      requestId.current = null
      onChanged()
    } catch (reason) {
      const apiError = toApiError(reason)
      if (apiError.code === 'HEARTS_FULL') {
        requestId.current = null
        onChanged()
      } else if (apiError.code === 'INSUFFICIENT_POINTS') {
        requestId.current = null
        setError(`Bạn cần ${status.refillCost} điểm để hồi đầy tim nhưng chưa đủ điểm.`)
      } else {
        setError(userMessage(apiError))
      }
    } finally {
      setRefilling(false)
    }
  }

  return (
    <section
      aria-label="Tim của bạn"
      className={`lp-hearts${depleted ? ' is-depleted' : ''}`}
      role={depleted ? 'alert' : 'status'}
    >
      <div className="lp-hearts__row">
        <ol aria-hidden="true" className="lp-hearts__icons">
          {Array.from({ length: status.maxHearts }, (_, index) => (
            <li className={index < status.hearts ? 'is-full' : 'is-empty'} key={index}>
              <Heart size={18} />
            </li>
          ))}
        </ol>
        <p className="lp-hearts__text">
          <b>{status.hearts}/{status.maxHearts}</b> tim
          {!full && waitMs !== null ? ` · tim kế tiếp sau ${formatWait(waitMs)}` : ''}
        </p>
        {!full ? (
          <Button
            className="lp-btn lp-hearts__refill"
            disabled={refilling}
            onClick={() => void refill()}
            type="button"
            variant={depleted ? 'default' : 'outline'}
          >
            {refilling ? <Loader2 aria-hidden="true" className="lp-spin" size={16} /> : <Heart aria-hidden="true" size={16} />}
            Hồi đầy · {status.refillCost} điểm
          </Button>
        ) : null}
      </div>
      {depleted ? (
        <p className="lp-hearts__note">
          Bạn đã hết tim nên chưa thể bắt đầu hoặc nộp bộ luyện tập. Bài ôn vẫn làm được.
        </p>
      ) : null}
      {error ? <p className="lp-error" role="alert">{error}</p> : null}
    </section>
  )
}
