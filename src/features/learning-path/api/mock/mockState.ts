import type { AnswerMap, AttemptResult, AttemptStatus, ExerciseState, ReviewStatus } from '~types/learningPath'

export const MOCK_STORAGE_KEY = 'ieltspath.learning-path.mock.v1'
const STATE_VERSION = 1

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface ExerciseProgress {
  state: ExerciseState
  attempts: number
  savedAnswers: AnswerMap | null
}

export interface ReviewRecord {
  id: string
  topicId: string
  kpCode: string
  resumeLessonId: string | null
  status: ReviewStatus
  setIndex: number
  createdSeq: number
}

export interface TopicTestRecord {
  passed: boolean
  assignmentCount: number
  lastPercent: number | null
}

export interface AssignmentRecord {
  id: string
  topicId: string
  packageCode: string
  packageVersionId: string
}

export interface AttemptResponseRecord {
  id: string
  payload: string
  answer: string
  revision: number
  savedAt: string
}

export interface AttemptRecord {
  id: string
  topicId: string
  packageCode: string
  packageVersionId: string
  status: AttemptStatus
  startedAt: string
  submittedAt: string | null
  rowVersion: number
  responses: Record<string, AttemptResponseRecord>
  result: AttemptResult | null
}

export interface MockState {
  version: typeof STATE_VERSION
  seq: number
  completedLessons: string[]
  exercises: Record<string, ExerciseProgress>
  /** Knowledge points answered wrongly on a block's first submission, waiting for the lesson to finish. */
  flaggedKps: Record<string, string[]>
  reviews: ReviewRecord[]
  topicTests: Record<string, TopicTestRecord>
  assignments: Record<string, AssignmentRecord>
  attempts: Record<string, AttemptRecord>
  processedRequests: Record<string, unknown>
}

export function createInitialState(): MockState {
  return {
    version: STATE_VERSION,
    seq: 1,
    completedLessons: [],
    exercises: {},
    flaggedKps: {},
    reviews: [],
    topicTests: {},
    assignments: {},
    attempts: {},
    processedRequests: {},
  }
}

export function loadState(storage: KeyValueStorage | null): MockState {
  if (!storage) return createInitialState()
  try {
    const raw = storage.getItem(MOCK_STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed = JSON.parse(raw) as Partial<MockState>
    return parsed.version === STATE_VERSION ? { ...createInitialState(), ...parsed } : createInitialState()
  } catch {
    return createInitialState()
  }
}

export function saveState(storage: KeyValueStorage | null, state: MockState) {
  if (!storage) return
  try {
    storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked: the demo keeps working in memory for this tab.
  }
}

export function clearState(storage: KeyValueStorage | null) {
  try {
    storage?.removeItem(MOCK_STORAGE_KEY)
  } catch {
    // Ignored for the same reason as saveState.
  }
}
