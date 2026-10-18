// Public room identity only. Authentication tokens remain in memory.
export function rememberMatchHost(matchId: string, hostUserId: string) {
  try {
    sessionStorage.setItem(`wordly-host:${matchId}`, hostUserId)
  } catch {
    /* Storage may be disabled. */
  }
}

export function recalledMatchHost(matchId: string): string | null {
  try {
    return sessionStorage.getItem(`wordly-host:${matchId}`)
  } catch {
    return null
  }
}
