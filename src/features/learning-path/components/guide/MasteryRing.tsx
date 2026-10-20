import type { CSSProperties } from 'react'
import type { MasteryTier } from '~types/learningPath'
import { masteryPercentOf } from '../../lib/masteryGuide'
import { tierMeta } from '../../lib/treeMeta'

/** A point's mastery as a ring, tinted by its tier; the number sits in the middle and is read out in full. */
export function MasteryRing({ mastery, tier }: { mastery: number; tier: MasteryTier }) {
  const percent = masteryPercentOf(mastery)
  const meta = tierMeta(tier)
  return (
    <span
      aria-label={`Mức thành thạo ${percent}%, ${meta.label}`}
      className={`lp-ring lp-ring--${meta.chip}`}
      role="img"
      style={{ '--ring': `${percent}%` } as CSSProperties}
    >
      <b aria-hidden="true">{percent}</b>
    </span>
  )
}
