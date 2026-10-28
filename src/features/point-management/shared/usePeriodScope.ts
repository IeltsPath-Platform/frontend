import { useMemo, useState } from 'react'
import { RANGE_LAST_3, batchesInRange, rangeOptions } from '../data/selectors'
import { usePointState } from '../data/store'

/**
 * The time filter of a page and what it leaves: the batches in range and every key of those batches. A page puts the
 * filter in one row above the content it scopes, so what is below it always describes the same batches.
 */
export function usePeriodScope() {
  const { keys, batches } = usePointState()
  const [range, setRange] = useState(RANGE_LAST_3)
  const options = useMemo(() => rangeOptions(batches), [batches])
  const scoped = useMemo(() => batchesInRange(batches, range), [batches, range])
  const scopedKeys = useMemo(() => {
    const codes = new Set(scoped.map((batch) => batch.code))
    return keys.filter((key) => codes.has(key.batch))
  }, [keys, scoped])
  return { range, setRange, options, scoped, scopedKeys }
}
