/** A timestamp in the viewer's locale, or an empty string when it is missing or unreadable. */
export function formatTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN')
}
