import { z } from 'zod'

// Activation retires the active rubric for the task. Versions need only be positive and unique, not increasing.
// Reads map criterion codes to knowledge points; author requests do not contain that mapping.
export const WRITING_TASKS = ['TASK_1', 'TASK_2'] as const
export const rubricVersionSchema = z.object({
  code: z.string(), task: z.enum(WRITING_TASKS), version: z.number().int().positive(), status: z.enum(['DRAFT', 'ACTIVE', 'RETIRED']),
})
export const bandDescriptorSchema = z.object({ band: z.number().min(0).max(9).multipleOf(0.5), descriptor: z.string() })
export const criterionRequestSchema = z.object({
  code: z.enum(['TA', 'TR', 'CC', 'LR', 'GRA']), name: z.string().trim().min(1).max(120), description: z.string().trim().min(1),
  sortOrder: z.number().int().min(1), bandDescriptors: z.array(bandDescriptorSchema.extend({ descriptor: z.string().trim().min(1) })).min(1),
})
export const exampleSchema = z.object({ band: z.number().min(0).max(9).multipleOf(0.5), prompt: z.string().trim().min(1), essay: z.string().trim().min(1), commentary: z.string().trim().min(1) })
export const rubricRequestSchema = z.object({
  code: z.string().trim().min(1), task: z.enum(WRITING_TASKS), version: z.number().int().positive(), sourceNote: z.string().trim().min(1),
  criteria: z.array(criterionRequestSchema).min(1), examples: z.array(exampleSchema),
}).superRefine((rubric, context) => {
  const codes = new Set<string>()
  rubric.criteria.forEach((criterion, index) => {
    if (codes.has(criterion.code)) context.addIssue({ code: 'custom', path: ['criteria', index, 'code'], message: 'Mã tiêu chí bị trùng.' })
    codes.add(criterion.code)
    const bands = criterion.bandDescriptors.map((item) => item.band)
    if (new Set(bands).size !== bands.length) context.addIssue({ code: 'custom', path: ['criteria', index, 'bandDescriptors'], message: 'Band trong một tiêu chí không được trùng.' })
  })
})
export const rubricSchema = z.object({
  code: z.string(), task: z.enum(WRITING_TASKS), version: z.number().int().positive(), status: z.enum(['DRAFT', 'ACTIVE', 'RETIRED']), sourceNote: z.string(),
  criteria: z.array(criterionRequestSchema.extend({ knowledgePointId: z.string().nullable() })), examples: z.array(exampleSchema),
})
export type WritingTask = (typeof WRITING_TASKS)[number]
export type Rubric = z.infer<typeof rubricSchema>
export type RubricVersion = z.infer<typeof rubricVersionSchema>
export type RubricRequest = z.infer<typeof rubricRequestSchema>
export type RubricCriterion = RubricRequest['criteria'][number]
export const RUBRIC_BANDS = Array.from({ length: 19 }, (_, index) => index * 0.5)
