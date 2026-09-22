import { useEffect, type ReactNode } from "react"
import { useAuthStore } from "@/features/auth/store/useAuthStore"

export function AppProvider({ children }: { children: ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth)

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  return children
}
