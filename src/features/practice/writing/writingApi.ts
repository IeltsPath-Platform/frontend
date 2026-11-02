import { apiRequest } from '@/lib/httpClient'

/** 'practice' is the screen with the guide and the dictionary; 'exam' is the timed screen that copies the real test. */
export type WritingMode = 'practice' | 'exam'

export interface WritingTask {
  packageId: string
  packageVersionId: string
  sectionId: string
  questionVersionId: string
  packageTitle: string
  title: string
  partNo: number | null
  task: 'TASK_1' | 'TASK_2' | null
  minWords: number | null
  timeLimitSeconds: number | null
  instructions: string | null
  prompt: string
  guide: string | null
  /** The model answer, one paragraph per part of the essay, with **phrases worth learning**; absent until one is written. */
  sampleAnswer?: string | null
  images: Array<{ url: string; altText: string | null }>
}

export interface GradingTerms {
  pointCost: number
  minWords: number
  maxWords: number
}

export interface WritingCriterion {
  code: string
  band: number
  strengths: string[]
  improvements: string[]
}

export interface WritingCorrection {
  excerpt: string
  suggestion: string
  category: 'GRAMMAR' | 'VOCABULARY' | 'COHERENCE' | 'TASK' | 'OTHER'
}

export interface WritingSubmission {
  submissionId: string
  /** AWAITING_EXAMINER: sent to an examiner instead of the AI; their review is read apart (see examinerApi). */
  status: 'GRADING' | 'PAYMENT_PENDING' | 'GRADED' | 'FAILED' | 'AWAITING_EXAMINER'
  task?: string
  wordCount?: number
  overallBand?: number
  passed?: boolean
  criteria?: WritingCriterion[]
  corrections?: WritingCorrection[]
  summary?: string
  pointsCharged?: number
  sampleAnswer?: string
  essayText?: string
  code?: string
  failureCode?: string
}

export function getWritingTask(packageVersionId: string, sectionId: string, signal?: AbortSignal) {
  return apiRequest<WritingTask>(`/api/content/practice-tests/${packageVersionId}/sections/${sectionId}/writing-task`, { auth: true, signal })
}

export function getGradingTerms(signal?: AbortSignal) {
  return apiRequest<GradingTerms>('/api/learning/free-writing/grading-terms', { auth: true, signal })
}

export function submitFreeWriting(input: { requestId: string; packageVersionId: string; questionVersionId: string; essayText: string }) {
  return apiRequest<WritingSubmission>('/api/learning/free-writing/submissions', { method: 'POST', auth: true, body: input })
}

export function getWritingSubmission(submissionId: string, signal?: AbortSignal) {
  return apiRequest<WritingSubmission>(`/api/learning/writing-submissions/${submissionId}`, { auth: true, signal })
}
