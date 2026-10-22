/** Roles that may open the admin area. Learners (CUSTOMER) and sales staff never see it. */
export const STAFF_ROLES = ['ADMIN', 'CONTENT_AUTHOR', 'EXAMINER'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export function hasAnyRole(roles: readonly string[] | undefined, allowed: readonly string[]): boolean {
  return Boolean(roles?.some((role) => allowed.includes(role)))
}
