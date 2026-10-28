import { z } from 'zod'

export const QUESTION_TYPES = [
  'MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'MATCHING', 'TRUE_FALSE_NOT_GIVEN', 'SHORT_ANSWER', 'ESSAY', 'SPEAKING',
] as const
export const PURPOSES = ['LEARNING', 'EXAM', 'PLACEMENT'] as const
export const PUBLICATION_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const
export const SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]
export type Purpose = (typeof PURPOSES)[number]
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number]
export type Difficulty = (typeof DIFFICULTIES)[number]

/** Question list item and the header of a question (`backend/docs/contracts/question-publication-v1.md`). */
export const questionSchema = z.object({
  id: z.string(),
  questionType: z.string(),
  skill: z.string().nullish(),
  accessLevel: z.string().nullish(),
  status: z.enum(PUBLICATION_STATUSES),
  currentPublishedVersionId: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  purpose: z.string().nullish(),
})

export const questionPageSchema = z.object({
  content: z.array(questionSchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
})

export const optionSchema = z.object({
  optionKey: z.string(),
  content: z.string(),
  sortOrder: z.number().nullish(),
})

export const versionSchema = z.object({
  id: z.string(),
  questionId: z.string().nullish(),
  versionNumber: z.number(),
  stem: z.string().nullish(),
  options: z.array(optionSchema).nullish(),
  answerSpecJson: z.string().nullish(),
  explanation: z.string().nullish(),
  hint: z.string().nullish(),
  difficulty: z.enum(DIFFICULTIES).nullish(),
  status: z.enum(PUBLICATION_STATUSES),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  knowledgePoints: z.array(z.object({ knowledgePointId: z.string(), weight: z.number().nullish() })).nullish(),
})

export const questionDetailSchema = questionSchema.extend({ versions: z.array(versionSchema).nullish() })

/** A reading passage that goes with a question version; `source` says how it was found. */
export const questionPassageSchema = z.object({
  assetId: z.string(),
  text: z.string(),
  source: z.enum(['DIRECT', 'LESSON', 'SECTION']),
  sourceName: z.string().nullish(),
})

export type Question = z.infer<typeof questionSchema>
export type QuestionPassage = z.infer<typeof questionPassageSchema>
export type QuestionPage = z.infer<typeof questionPageSchema>
export type QuestionVersion = z.infer<typeof versionSchema>
export type QuestionDetail = z.infer<typeof questionDetailSchema>

export interface VersionRequest {
  versionNumber: number
  stem: string
  options: Array<{ optionKey: string; content: string; sortOrder: number }>
  answerSpecJson: string | null
  explanation: string | null
  hint: string | null
  difficulty: Difficulty | null
  knowledgePoints: Array<{ knowledgePointId: string; weight: number }>
}

export interface QuestionFilters {
  skill?: string
  purpose?: string
  status?: string
  knowledgePointId?: string
  page?: number
  size?: number
}
