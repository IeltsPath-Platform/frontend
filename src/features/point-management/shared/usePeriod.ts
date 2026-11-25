import { useMemo, useState } from 'react'
import { ALL_PERIODS, periodOptions } from '../data/selectors'

/**
 * The time filter of a page: the month it shows (YYYY-MM) or all of them. The options are the twelve months up to this
 * one, computed when the page opens.
 */
export function usePeriod() {
  const [period, setPeriod] = useState(ALL_PERIODS)
  const options = useMemo(() => periodOptions(), [])
  return { period, setPeriod, options }
}
