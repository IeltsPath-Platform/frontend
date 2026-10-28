import { useSyncExternalStore } from 'react'
import type { UserTier } from '@/components/UserTierDropdown'
import { accessApi } from './api/accessApi'
import { authApi } from './api/authApi'
import { profileApi } from '@/features/profile/api/profileApi'
import type { UserResponse } from './api/types'
import { clearAccessToken, setAccessToken, tryRestoreSession } from '@/lib/httpClient'

export interface AuthSessionSnapshot {
  isLoggedIn: boolean
  hydrated: boolean
  points: number
  tier: UserTier
  userName: string
  email: string | null
  avatarUrl: string | null
  userId: string | null
  roles: string[]
}

const GUEST_SESSION: AuthSessionSnapshot = {
  isLoggedIn: false,
  hydrated: false,
  points: 0,
  tier: 'FREE',
  userName: 'Học viên',
  email: null,
  avatarUrl: null,
  userId: null,
  roles: [],
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

async function refreshAvatar() {
  try {
    const profile = await profileApi.getProfile()
    session = { ...session, avatarUrl: profile.avatarReference || null }
    emitChange()
  } catch {
    // The initials stand in for the avatar when the profile cannot be read.
  }
}

function applyUser(user: UserResponse) {
  session = {
    ...session,
    isLoggedIn: true,
    hydrated: true,
    userName: user.fullName || user.email.split('@')[0] || GUEST_SESSION.userName,
    email: user.email,
    userId: user.id,
    roles: user.roles.map((role) => role.name),
  }
  emitChange()
}

export function useAuthSession() {
  return useSyncExternalStore(subscribe, getSnapshot, () => GUEST_SESSION)
}

export function updateAuthUserProfile(updates: { userName?: string; email?: string; avatarUrl?: string | null }) {
  session = { ...session, ...updates }
  emitChange()
}

export function clearAuthSession() {
  window.dispatchEvent(new Event('study-session-ending'))
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
    await Promise.all([refreshPoints(), refreshAvatar()])
    return true
  } catch {
    clearAccessToken()
    session = { ...GUEST_SESSION, hydrated: true }
    emitChange()
    return false
  }
}

export async function loginWithAccessToken(accessToken: string) {
  setAccessToken(accessToken)
  const user = await authApi.me()
  applyUser(user)
  await Promise.all([refreshPoints(), refreshAvatar()])
  return user
}

export async function loginWithPassword(email: string, password: string) {
  const tokens = await authApi.login({ email, password })
  return loginWithAccessToken(tokens.accessToken)
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
  window.dispatchEvent(new Event('study-session-ending'))
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
