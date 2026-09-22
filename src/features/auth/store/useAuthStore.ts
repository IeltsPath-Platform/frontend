import { create } from "zustand"
import { apiClient } from "@/lib/api/axios"
import { CURRENT_STUDENT } from "@/lib/mock/users"
import type { User } from "@/types/auth"

interface AuthResponse {
  user: User
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isInitialLoading: boolean
  checkAuth: () => Promise<void>
  signInWithMock: () => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialLoading: true,
  checkAuth: async () => {
    try {
      const { data } = await apiClient.get<AuthResponse>("/api/users/me")
      set({ user: data.user, isAuthenticated: true })
    } catch {
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isInitialLoading: false })
    }
  },
  signInWithMock: () => set({ user: CURRENT_STUDENT, isAuthenticated: true, isInitialLoading: false }),
  signOut: () => set({ user: null, isAuthenticated: false, isInitialLoading: false }),
}))
