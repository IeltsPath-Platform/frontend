const rawBase = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').trim()

/** Gateway base URL without trailing slash. */
export const API_BASE_URL = rawBase.replace(/\/+$/, '') || 'http://localhost:8080'

export const REQUEST_TIMEOUT_MS = 30_000

/** Writing grading can exceed the default API timeout. */
export const WRITING_REQUEST_TIMEOUT_MS = 60_000

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

/**
 * Rocket game calls `/api/games/rocket/**`.
 * Set VITE_USE_MOCK_ROCKET=true to run it on an in-browser mock instead.
 */
export const USE_MOCK_ROCKET = import.meta.env.VITE_USE_MOCK_ROCKET === 'true'

/** Google Identity Services web client ID. */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
