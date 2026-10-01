import { createMockLearningApi } from './mock/mockLearningApi'
import type { KeyValueStorage } from './mock/mockState'

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** Swap this for an HTTP implementation of `LearningApi` once the backend endpoints exist. */
export const learningApi = createMockLearningApi({ storage: browserStorage(), latencyMs: 350 })

export { ApiError, isApiError, toApiError } from './apiError'
export type { ApiErrorCode } from './apiError'
export type { LearningApi } from './learningApi'
