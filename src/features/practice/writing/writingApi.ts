import { apiRequest } from '@/lib/httpClient'

export type WritingMode = 'free' | 'guided'

export interface GuideVocabulary {
  en: string
  vi: string
}

/** One step of the step-by-step mode: what to write, the theory behind it, a sentence frame and a sample. */
export interface GuideStep {
  no: number
  /** The part of the essay the step belongs to: Introduction, Overview, Body 1, Body 2, Conclusion. */
  section: string
  title: string
  instruction: string
  theory: string
  structure: string
  vocabulary: GuideVocabulary[]
  example: string
}

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
  guideSteps: GuideStep[] | null
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
  status: 'GRADING' | 'PAYMENT_PENDING' | 'GRADED' | 'FAILED'
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
