import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthSession } from './authSession'
import { hasAnyRole, signInDestination } from './staffRoles'

export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useAuthSession()
  const location = useLocation()

  if (!session.isLoggedIn) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return children
}

/**
 * Renders `children` only when the signed-in user holds one of `roles`. Anyone else sees `fallback`, so a missing role
 * is explained instead of silently redirecting. Mount it inside `RequireAuth`.
 */
export function RequireRole({
  roles,
  children,
  fallback = <p role="alert">Bạn không có quyền truy cập trang này.</p>,
}: {
  roles: readonly string[]
  children: ReactNode
  fallback?: ReactNode
}) {
  const session = useAuthSession()
  return hasAnyRole(session.roles, roles) ? children : fallback
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const session = useAuthSession()
  const location = useLocation()
  if (session.isLoggedIn) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
    return <Navigate replace to={signInDestination(session.roles, from)} />
  }
  return children
}
