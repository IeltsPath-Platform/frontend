import { z } from 'zod'

export const adminItemSchema = z.object({
  ipaUk: z.string().max(100).nullable().optional(),
  ipaUs: z.string().max(100).nullable().optional(),
  audioUkReference: z.string().max(500).nullable().optional(),
  audioUsReference: z.string().max(500).nullable().optional(),
  frequencyRank: z.coerce.number().int().min(1).max(100000).nullable().optional(),
  academicWordList: z.boolean().nullable().optional(),
  wordFamily: z.string().max(500).nullable().optional(),
})

export const adminSenseSchema = z.object({
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', '']).nullable().optional(),
  topicId: z.string().uuid().nullable().optional().or(z.literal('')),
  register: z.string().max(100).nullable().optional(),
  grammarNote: z.string().max(500).nullable().optional(),
  usageNote: z.string().max(1000).nullable().optional(),
  exampleTranslation: z.string().max(1000).nullable().optional(),
})

export const adminTopicSchema = z.object({
  slug: z.string().trim().min(2, 'Slug tối thiểu 2 ký tự').max(100),
  name: z.string().trim().min(2, 'Tên tiếng Anh tối thiểu 2 ký tự').max(200),
  nameVi: z.string().trim().min(2, 'Tên tiếng Việt tối thiểu 2 ký tự').max(200),
  coverKey: z.string().max(500).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export const adminSetSchema = z.object({
  title: z.string().trim().min(2, 'Tiêu đề bộ từ tối thiểu 2 ký tự').max(200),
  description: z.string().max(1000).nullable().optional(),
  kind: z.enum(['BAND', 'TOPIC']),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', '']).nullable().optional(),
  topicId: z.string().uuid().nullable().optional().or(z.literal('')),
  coverKey: z.string().max(500).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export const collocationSchema = z.object({
  phrase: z.string().trim().min(1, 'Cụm từ không được để trống'),
  meaningVi: z.string().max(500).optional(),
  example: z.string().max(1000).optional(),
})

export const relationSchema = z.object({
  relatedLemma: z.string().trim().min(1, 'Từ liên kết không được để trống'),
  kind: z.enum(['SYNONYM', 'ANTONYM', 'RELATED']),
  relatedItemId: z.string().uuid().nullable().optional().or(z.literal('')),
})

export const commonMistakeSchema = z.object({
  wrongUsage: z.string().trim().min(1, 'Cách dùng sai không được để trống'),
  correctUsage: z.string().trim().min(1, 'Cách dùng đúng không được để trống'),
  explanation: z.string().max(1000).optional(),
})

export const exampleSchema = z.object({
  sentence: z.string().trim().min(1, 'Câu ví dụ không được để trống'),
  translationVi: z.string().max(1000).optional(),
})

