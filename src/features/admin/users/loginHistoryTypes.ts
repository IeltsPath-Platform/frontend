import { z } from 'zod'

export const loginAttemptSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  // Left open so a reason the backend adds later still parses; unknown codes show as a generic failure.
  failureReason: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  createdAt: z.string(),
})

export const loginHistoryPageSchema = z.object({
  items: z.array(loginAttemptSchema),
  page: z.number(),
  size: z.number(),
  total: z.number(),
})

export type LoginAttempt = z.infer<typeof loginAttemptSchema>
export type LoginHistoryPage = z.infer<typeof loginHistoryPageSchema>
