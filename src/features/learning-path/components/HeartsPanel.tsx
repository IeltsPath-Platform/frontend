import { useEffect, useRef, useState } from 'react'
import { Heart } from 'lucide-react'
import type { HeartsStatus } from '~types/learningPath'
import { formatWait } from '../lib/formatWait'

/**
 * The learner's hearts at a glance: how many are left and when the next one returns. It only shows; buying hearts is
 * the owl's popup, which opens when the hearts run out.
 */
export function HeartsPanel({ status, onChanged }: { status: HeartsStatus; onChanged: () => void }) {
  const [now, setNow] = useState(() => Date.now())
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

  return (
    <section aria-label="Tim của bạn" className={`lp-hearts${depleted ? ' is-depleted' : ''}`} role="status">
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
      </div>
    </section>
  )
}
