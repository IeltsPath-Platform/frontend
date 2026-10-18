/** "3 giờ 20 phút" / "45 phút": the wait until the next heart, rounded up to the minute. */
export function formatWait(milliseconds: number): string {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60_000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} phút`
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`
}
