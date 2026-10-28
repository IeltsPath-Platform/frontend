import { HttpError } from '@/lib/httpClient'
import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'

const RULE_MESSAGES: Record<string, string> = {
  ROLE_CONFLICT: 'Tài khoản quản trị hệ thống không được kiêm vai trò Content Author hoặc Examiner.',
  SELF_ADMIN_REMOVAL: 'Bạn không thể tự gỡ quyền quản trị của chính mình.',
  SELF_ACCOUNT_CHANGE: 'Bạn không thể tự khóa hoặc xóa tài khoản đang dùng.',
  LAST_ADMIN: 'Đây là tài khoản quản trị cuối cùng đang hoạt động, không thể gỡ, khóa hay xóa.',
}

export function userAdminErrorText(reason: unknown): string {
  const code = adminErrorCode(reason)
  if (code && RULE_MESSAGES[code]) return RULE_MESSAGES[code]
  if (reason instanceof HttpError && reason.status === 409 && /email/i.test(reason.message)) {
    return 'Email đã được dùng.'
  }
  return adminErrorMessage(reason)
}
