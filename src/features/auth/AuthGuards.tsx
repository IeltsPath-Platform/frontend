import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthSession } from './authSession'

export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useAuthSession()
  const location = useLocation()

  if (!session.isLoggedIn) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const session = useAuthSession()
  if (session.isLoggedIn) {
    return <Navigate replace to="/learn" />
  }
  return children
}
