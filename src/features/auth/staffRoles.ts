/** Roles that may open the admin area. Learners (CUSTOMER) and sales staff never see it. */
export const STAFF_ROLES = ['ADMIN', 'CONTENT_AUTHOR', 'EXAMINER'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export function hasAnyRole(roles: readonly string[] | undefined, allowed: readonly string[]): boolean {
  return Boolean(roles?.some((role) => allowed.includes(role)))
}

/** Staff enter their workspace even when sign-in started on a learner page. */
export function signInDestination(roles: readonly string[] | undefined, from?: string): string {
  if (hasAnyRole(roles, ['ADMIN'])) return '/admin'
  if (hasAnyRole(roles, ['CONTENT_AUTHOR'])) return '/content-author'
  if (hasAnyRole(roles, ['EXAMINER'])) return '/admin'
  return from || '/overview'
}
