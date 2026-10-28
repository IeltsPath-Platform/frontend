const NUMBER = new Intl.NumberFormat('vi-VN')

const pad = (value: number) => String(value).padStart(2, '0')

export function formatNumber(value: number): string {
  return NUMBER.format(value)
}

/** A calendar day (YYYY-MM-DD) or a full timestamp, shown as dd/mm/yyyy. Null means "no limit" here. */
export function formatDate(value: string | null): string {
  if (!value) return '—'
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (day) return `${day[3]}/${day[2]}/${day[1]}`
  const date = new Date(value)
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

function clock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 28/10/2026 09:14 */
export function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return `${formatDate(value)} ${clock(new Date(value))}`
}

/** 28/10 09:14, for dense lists. */
export function formatShortDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${clock(date)}`
}

/** IP-••••-••••-K7MQ: only the last group of a key is shown until the flow reveals it. */
export function maskCode(code: string): string {
  return `IP-••••-••••-${code.slice(-4)}`
}
