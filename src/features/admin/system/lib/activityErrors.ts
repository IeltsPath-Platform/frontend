import { HttpError } from '@/lib/httpClient'
import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'

export function activityErrorText(reason: unknown): string {
  const code = adminErrorCode(reason)
  if (code === 'INVALID_RANGE') return 'Ngày kết thúc không được trước ngày bắt đầu.'
  if (code === 'RANGE_TOO_LONG') return 'Khoảng thời gian không được vượt quá 180 ngày.'
  if (reason instanceof HttpError && reason.status === 400 && /INVALID_RANGE/.test(reason.message)) {
    return 'Ngày kết thúc không được trước ngày bắt đầu.'
  }
  if (reason instanceof HttpError && reason.status === 400 && /RANGE_TOO_LONG/.test(reason.message)) {
    return 'Khoảng thời gian không được vượt quá 180 ngày.'
  }
  return adminErrorMessage(reason)
}
