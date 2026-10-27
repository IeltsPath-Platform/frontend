import { z } from 'zod'

const count = z.int().nonnegative()

/** The examiner's own numbers: queue by state, today's intake against the daily limit, finished work. */
export const summarySchema = z.object({
  queued: count,
  processing: count,
  /** Open jobs 36 to 48 hours after the learner chose the examiner: not late yet, but the examiner was reminded. */
  dueSoon: count,
  overdue: count,
  completedToday: count,
  completedThisWeek: count,
  receivedToday: count,
  /** Null when the limit could not be read; the other numbers are still right. */
  dailyLimit: z.int().positive().nullish(),
  /** With this many late jobs ({@code overdue}) the examiner takes no new submission until they grade some. */
  overdueLimit: z.int().positive().nullish(),
})
export type Summary = z.infer<typeof summarySchema>

export const certificateSchema = z.object({
  name: z.string(),
  issuer: z.string().nullish(),
  year: z.number().nullish(),
  score: z.string().nullish(),
})
export type Certificate = z.infer<typeof certificateSchema>

/** The examiner's profile as learners see it when choosing who grades. The daily limit is not part of it. */
export const profileSchema = z.object({
  id: z.guid(),
  displayName: z.string(),
  avatarUrl: z.string().nullish(),
  bio: z.string().nullish(),
  ieltsBand: z.number().nullish(),
  certificates: z.array(certificateSchema),
  acceptingSubmissions: z.boolean(),
})
export type Profile = z.infer<typeof profileSchema>

/** What `PUT /api/users/me/examiner-profile` replaces: all three fields every time. */
export interface ProfileInput {
  ieltsBand: number | null
  certificates: Certificate[]
  acceptingSubmissions: boolean
}

export const MAX_CERTIFICATES = 10
