/** Roles that may open a staff workspace. */
export const STAFF_ROLES = ['ADMIN', 'CONTENT_AUTHOR', 'EXAMINER'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]
export type StaffArea = 'admin' | 'content-author' | 'examiner'

export function hasAnyRole(roles: readonly string[] | undefined, allowed: readonly string[]): boolean {
  return Boolean(roles?.some((role) => allowed.includes(role)))
}

/** Staff enter their workspace even when sign-in started on a learner page. */
export function signInDestination(roles: readonly string[] | undefined, from?: string): string {
  if (hasAnyRole(roles, ['ADMIN'])) return '/admin'
  // Straight to each workspace's own overview: its root renders that page, and sign-in already navigates twice in a row.
  if (hasAnyRole(roles, ['CONTENT_AUTHOR'])) return '/content-author'
  if (hasAnyRole(roles, ['EXAMINER'])) return '/examiner'
  return from || '/overview'
}
