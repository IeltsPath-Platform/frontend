import { useEffect, type ReactNode } from 'react'
import { clearAuthSession, hydrateAuthSession, useAuthSession } from './authSession'
import { onSessionExpired } from '@/lib/httpClient'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { hydrated } = useAuthSession()

  useEffect(() => {
    void hydrateAuthSession()
    onSessionExpired(() => {
      clearAuthSession()
    })
    return () => onSessionExpired(null)
  }, [])

  if (!hydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Đang khôi phục phiên đăng nhập…
      </div>
    )
  }

  return children
}
