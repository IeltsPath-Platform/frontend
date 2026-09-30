import { useSyncExternalStore } from 'react'
import type { UserTier } from '@/components/UserTierDropdown'

export interface AuthSessionSnapshot {
  isLoggedIn: boolean
  points: number
  tier: UserTier
  userName: string
}

const GUEST_SESSION: AuthSessionSnapshot = {
  isLoggedIn: false,
  points: 120,
  tier: 'FREE',
  userName: 'Học viên',
}

let session = GUEST_SESSION
const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

function getDisplayName(email: string) {
  const localPart = email.split('@')[0]?.trim().replace(/[._-]+/g, ' ') ?? ''
  return localPart || GUEST_SESSION.userName
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return session
}

/** Client-only UI state: no password or session is persisted, and no backend is contacted. */
export function useAuthSession() {
  return useSyncExternalStore(subscribe, getSnapshot, () => GUEST_SESSION)
}

export function signInForDemo(email: string) {
  session = { ...session, isLoggedIn: true, userName: getDisplayName(email) }
  emitChange()
}

export function setDemoTier(tier: UserTier) {
  session = { ...session, tier }
  emitChange()
}
