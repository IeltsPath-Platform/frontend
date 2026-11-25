const EVENT_LABELS: Record<string, string> = {
  PASSWORD_CHANGED: 'Đổi mật khẩu',
  PASSWORD_RESET: 'Đặt lại mật khẩu',
  PASSWORD_SET: 'Tạo mật khẩu',
  GOOGLE_LINKED: 'Liên kết Google',
  GOOGLE_UNLINKED: 'Hủy liên kết Google',
  GOOGLE_PASSWORD_CLEARED: 'Xóa mật khẩu khi liên kết Google',
  SESSION_REVOKED: 'Đăng xuất một thiết bị',
  SESSIONS_REVOKED_ALL: 'Đăng xuất tất cả thiết bị',
  REFRESH_REUSE_DETECTED: 'Phát hiện phiên đăng nhập bị dùng lại',
  REAUTH_SUCCEEDED: 'Xác thực lại thành công',
  REAUTH_FAILED: 'Xác thực lại thất bại',
  ACCOUNT_STATUS_CHANGED: 'Thay đổi trạng thái tài khoản',
  ROLE_CHANGED: 'Thay đổi vai trò',
}

/** Vietnamese name of a security event; a type the client does not know is shown as sent. */
export function securityEventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType
}
