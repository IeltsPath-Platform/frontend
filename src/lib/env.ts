const rawBase = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').trim()

/** Gateway base URL without trailing slash. */
export const API_BASE_URL = rawBase.replace(/\/+$/, '') || 'http://localhost:8080'

export const REQUEST_TIMEOUT_MS = 30_000

/**
 * Mock learning when explicitly true, or when API base is unset and flag omitted.
 * Default with a configured base URL: false (HTTP).
 */
export const USE_MOCK_LEARNING = (() => {
  const flag = import.meta.env.VITE_USE_MOCK_LEARNING
  if (flag === 'true') return true
  if (flag === 'false') return false
  return !import.meta.env.VITE_API_BASE_URL
})()
