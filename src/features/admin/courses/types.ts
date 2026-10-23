import { z } from 'zod'

export const CONTENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export const TOPIC_SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const
export const courseSchema = z.object({
  id: z.string(), code: z.string(), name: z.string(), bandLevel: z.number().min(0).max(9),
  status: z.enum(CONTENT_STATUSES), createdAt: z.string(), updatedAt: z.string(),
})
export const topicSchema = z.object({
  id: z.string(), parentTopicId: z.string().nullable(), code: z.string(), name: z.string(),
  sortOrder: z.number().int(), status: z.enum(CONTENT_STATUSES),
  bandMin: z.number().nullable(), bandMax: z.number().nullable(), skill: z.enum(TOPIC_SKILLS).nullable(),
  courseId: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(),
})
export type Course = z.infer<typeof courseSchema>
export type CourseCreate = Pick<Course, 'code' | 'name' | 'bandLevel'>
export type CourseUpdate = Pick<Course, 'name' | 'bandLevel' | 'status'>
export type TopicCreate = Pick<z.infer<typeof topicSchema>, 'code' | 'name' | 'parentTopicId' | 'sortOrder' | 'bandMin' | 'bandMax' | 'skill' | 'courseId'>
export type TopicUpdate = Omit<TopicCreate, 'code'> & { status: Course['status'] }
export const SKILL_LABEL = { LISTENING: 'Nghe', READING: 'Đọc', WRITING: 'Viết', SPEAKING: 'Nói' }
export function validBand(value: string) {
  const number = Number(value)
  return value.trim() !== '' && Number.isFinite(number) && number >= 0 && number <= 9 && Number.isInteger(number * 2)
}
