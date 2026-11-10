/** The API sends a set's IELTS band range as `{min, max}`; older payloads and tests use a ready-made string. */
export type BandRangeValue = string | { min: number; max: number } | null | undefined

/** "4.0–5.0" for a range, the text itself for a string, and null when there is nothing to show. */
export function formatBandRange(value: BandRangeValue): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value.trim() || null
  if (!Number.isFinite(value.min) || !Number.isFinite(value.max)) return null
  return value.min === value.max ? value.min.toFixed(1) : `${value.min.toFixed(1)}–${value.max.toFixed(1)}`
}
