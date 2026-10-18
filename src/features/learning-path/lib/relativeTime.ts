const UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: 'year', seconds: 365 * 24 * 3600 },
  { unit: 'month', seconds: 30 * 24 * 3600 },
  { unit: 'week', seconds: 7 * 24 * 3600 },
  { unit: 'day', seconds: 24 * 3600 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
]

const FORMAT = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })

/** "5 phút trước", "hôm qua"…; anything under a minute ago reads "vừa xong". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000)
  if (Math.abs(seconds) < 60) return 'vừa xong'
  const { unit, seconds: size } = UNITS.find((entry) => Math.abs(seconds) >= entry.seconds) ?? UNITS[UNITS.length - 1]
  return FORMAT.format(Math.round(seconds / size), unit)
}
