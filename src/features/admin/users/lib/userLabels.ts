import type { UserRole, UserStatus } from '../types'

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Quản trị hệ thống',
  CONTENT_AUTHOR: 'Content Author',
  EXAMINER: 'Examiner',
  STAFF_MANAGER: 'Staff Manager',
  SALES_STAFF: 'Sales Staff',
  CUSTOMER: 'Learner',
}

/** Roles shown first win when an account holds several (the avatar takes the colour of the first). */
export function primaryRole(roles: readonly { name: UserRole }[]): UserRole | null {
  const order: readonly UserRole[] = ['ADMIN', 'CONTENT_AUTHOR', 'EXAMINER', 'STAFF_MANAGER', 'SALES_STAFF', 'CUSTOMER']
  return order.find((role) => roles.some((item) => item.name === role)) ?? null
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
