import type { LoginAttempt } from '../loginHistoryTypes'

const FAILURE_LABEL: Record<string, string> = {
  BAD_PASSWORD: 'Sai mật khẩu',
  ACCOUNT_LOCKED: 'Tài khoản bị khóa',
  ACCOUNT_INACTIVE: 'Tài khoản đã ngừng',
  ACCOUNT_UNVERIFIED: 'Chưa xác minh',
}

export function loginResultLabel(attempt: Pick<LoginAttempt, 'success' | 'failureReason'>): string {
  if (attempt.success) return 'Thành công'
  return (attempt.failureReason && FAILURE_LABEL[attempt.failureReason]) || 'Thất bại'
}

// Order matters: Edge and Opera also say "Chrome", and Chrome also says "Safari".
const BROWSERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]

// iPhone and iPad user agents also say "like Mac OS X", so they come before macOS.
const SYSTEMS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Windows/, 'Windows'],
  [/Android/, 'Android'],
  [/iPhone|iPad/, 'iOS'],
  [/Mac OS X/, 'macOS'],
  [/Linux/, 'Linux'],
]

/** A short "Chrome · Windows" for a user agent; the full string is kept for a tooltip. */
export function deviceLabel(userAgent: string | null | undefined): string {
  if (!userAgent) return '—'
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1]
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1]
  return [browser, system].filter(Boolean).join(' · ') || 'Không rõ'
}
