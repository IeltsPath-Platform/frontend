import { apiRequest } from '@/lib/httpClient'

export type WritingTaskKey = 'TASK_1' | 'TASK_2'

/** One graded first essay; `criteria` keys are TA or TR, CC, LR, GRA. Bands are the stored bands. */
export interface WritingProgressPoint {
  submissionId: string
  source: 'LESSON' | 'PRACTICE' | 'FREE' | string
  gradedAt: string
  overallBand: number
  criteria: Record<string, number>
  promptVersion: string | null
}

export interface WritingRecurringError {
  errorCode: string
  errorName: string | null
  fixHint: string | null
  /** Present only when the error type maps to a knowledge point that has a practice set. */
  practiceKnowledgePointId: string | null
  essaysWithError: number
  essaysTotal: number
  lastSeenAt: string
}

export interface WritingFixedError {
  errorCode: string
  errorName: string | null
  lastSeenAt: string
  cleanEssaysSince: number
}

export interface WritingTaskProgress {
  task: WritingTaskKey
  points: WritingProgressPoint[]
  recurringErrors: WritingRecurringError[]
  fixedErrors: WritingFixedError[]
  insufficient: boolean
}

export interface WritingProgress {
  tasks: WritingTaskProgress[]
}

/** Contract: docs/contracts/writing-progress-v1.md in the backend repository. */
export const writingProgressApi = {
  get: (task: WritingTaskKey, signal: AbortSignal) =>
    apiRequest<WritingProgress>(`/api/learning/writing/progress?task=${task}`, { signal, auth: true }),
}
