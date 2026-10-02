import { createMockLearningApi } from './mock/mockLearningApi'
import { createHttpLearningApi } from './httpLearningApi'
import { USE_MOCK_LEARNING } from '@/lib/env'
import type { KeyValueStorage } from './mock/mockState'
import type { LearningApi, MockLearningControls } from './learningApi'

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

const mockApi = createMockLearningApi({ storage: browserStorage(), latencyMs: 350 })

export const learningApi: LearningApi = USE_MOCK_LEARNING ? mockApi : createHttpLearningApi()

export const learningDemoControls: MockLearningControls | null = USE_MOCK_LEARNING ? mockApi : null

export const isMockLearning = USE_MOCK_LEARNING

export { ApiError, isApiError, toApiError } from './apiError'
export type { ApiErrorCode } from './apiError'
export type { LearningApi } from './learningApi'
