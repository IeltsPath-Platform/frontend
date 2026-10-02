import { useSyncExternalStore } from 'react'
import type { UserTier } from '@/components/UserTierDropdown'
import { accessApi } from './api/accessApi'
import { authApi } from './api/authApi'
import type { UserResponse } from './api/types'
import { clearAccessToken, setAccessToken, tryRestoreSession } from '@/lib/httpClient'

export interface AuthSessionSnapshot {
  isLoggedIn: boolean
  hydrated: boolean
  points: number
  tier: UserTier
  userName: string
  email: string | null
}

const GUEST_SESSION: AuthSessionSnapshot = {
  isLoggedIn: false,
  hydrated: false,
  points: 0,
  tier: 'FREE',
  userName: 'Học viên',
  email: null,
}

let session = GUEST_SESSION
const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return session
}

async function refreshPoints() {
  try {
    const points = await accessApi.getMyPoints()
    session = { ...session, points: points.balance }
    emitChange()
  } catch {
    // Points are optional for Reading-only paths.
  }
}

function applyUser(user: UserResponse) {
  session = {
    ...session,
    isLoggedIn: true,
    hydrated: true,
    userName: user.fullName || user.email.split('@')[0] || GUEST_SESSION.userName,
    email: user.email,
  }
  emitChange()
}

export function useAuthSession() {
  return useSyncExternalStore(subscribe, getSnapshot, () => GUEST_SESSION)
}

export function setDemoTier(tier: UserTier) {
  session = { ...session, tier }
  emitChange()
}

export function clearAuthSession() {
  clearAccessToken()
  session = { ...GUEST_SESSION, hydrated: true }
  emitChange()
}

export async function hydrateAuthSession(): Promise<boolean> {
  try {
    const restored = await tryRestoreSession()
    if (!restored) {
      session = { ...GUEST_SESSION, hydrated: true }
      emitChange()
      return false
    }
    const user = await authApi.me()
    applyUser(user)
    await refreshPoints()
    return true
  } catch {
    clearAccessToken()
    session = { ...GUEST_SESSION, hydrated: true }
    emitChange()
    return false
  }
}

export async function loginWithPassword(email: string, password: string) {
  const tokens = await authApi.login({ email, password })
  setAccessToken(tokens.accessToken)
  const user = await authApi.me()
  applyUser(user)
  await refreshPoints()
  return user
}

export async function registerWithPassword(input: {
  email: string
  password: string
  fullName: string
}) {
  await authApi.register(input)
  return loginWithPassword(input.email, input.password)
}

export async function logoutSession() {
  try {
    await authApi.logout()
  } catch {
    // Still clear local session if the network call fails.
  }
  clearAuthSession()
}

export async function reloadSessionPoints() {
  if (!session.isLoggedIn) return
  await refreshPoints()
}
