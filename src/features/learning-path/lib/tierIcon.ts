import { Check, Minus, Target, TrendingUp, type LucideIcon } from 'lucide-react'
import type { TierGroup } from './treeMeta'

/** A shape as well as a colour for each mastery group, so the state of a point never rests on colour alone. */
export const TIER_ICON: Record<TierGroup, LucideIcon> = { MAINTAIN: Check, CONSOLIDATE: TrendingUp, PRIORITY: Target, PENDING: Minus }
