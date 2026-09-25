import { create } from "zustand"
import { apiClient } from "@/lib/api/axios"
import { CURRENT_STUDENT } from "@/lib/mock/users"
import type { User, MembershipTier } from "@/types/auth"

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
  setTier: (tier: MembershipTier) => void
  toggleTier: () => void
  deductPoints: (amount: number) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: CURRENT_STUDENT,
  isAuthenticated: true,
  isInitialLoading: false,
  checkAuth: async () => {
    try {
      const { data } = await apiClient.get<AuthResponse>("/api/users/me")
      set({ user: data.user, isAuthenticated: true })
    } catch {
      // In mock/frontend-only mode, maintain the mock student session
      set((state) => ({
        user: state.user ?? CURRENT_STUDENT,
        isAuthenticated: state.user !== null,
      }))
    } finally {
      set({ isInitialLoading: false })
    }
  },
  signInWithMock: () => set({ user: CURRENT_STUDENT, isAuthenticated: true, isInitialLoading: false }),
  signOut: () => set({ user: null, isAuthenticated: false, isInitialLoading: false }),
  setTier: (tier: MembershipTier) =>
    set((state) => {
      if (!state.user) return state
      return {
        user: {
          ...state.user,
          tier,
          points: tier === "FREE" ? (state.user.points ?? 120) : 9999,
        },
      }
    }),
  toggleTier: () =>
    set((state) => {
      if (!state.user) return state
      const nextTier: MembershipTier = state.user.tier === "PREMIUM" ? "FREE" : "PREMIUM"
      return {
        user: {
          ...state.user,
          tier: nextTier,
          points: nextTier === "FREE" ? 120 : 9999,
        },
      }
    }),
  deductPoints: (amount: number) =>
    set((state) => {
      if (!state.user) return state
      if (state.user.tier === "PREMIUM") return state // Unlimited for premium
      const currentPoints = state.user.points ?? 120
      return {
        user: {
          ...state.user,
          points: Math.max(0, currentPoints - amount),
        },
      }
    }),
}))
