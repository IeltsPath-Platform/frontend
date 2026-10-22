import type { UserRole, UserStatus } from '../types'

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Quản trị hệ thống',
  CONTENT_AUTHOR: 'R&D (nội dung)',
  EXAMINER: 'Mentor',
  CUSTOMER: 'Học viên',
  SALES_STAFF: 'Kinh doanh',
}

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng',
  LOCKED: 'Bị khóa',
  PENDING_VERIFY: 'Chờ xác minh',
}

export function hasRoleConflict(roles: readonly string[]) {
  return roles.includes('ADMIN') && (roles.includes('CONTENT_AUTHOR') || roles.includes('EXAMINER'))
}
