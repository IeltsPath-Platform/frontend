import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'

const planSchema = z.object({ id: z.string(), code: z.string(), name: z.string(), status: z.string() })
export type AccessPlan = z.infer<typeof planSchema>

const ledgerSchema = z.object({ id: z.string(), delta: z.number(), balanceAfter: z.number() })
export type PointAdjustment = z.infer<typeof ledgerSchema>

const subscriptionSchema = z.object({ id: z.string(), planName: z.string(), endsAt: z.string().nullable() })
export type GrantedSubscription = z.infer<typeof subscriptionSchema>

/**
 * Manual point corrections and Premium grants by an administrator. Each call carries a key made once per form, so a
 * retry after a timeout cannot apply the same change twice.
 */
export const accessAdminApi = {
  listPlans: async (signal?: AbortSignal) =>
    z.array(planSchema).parse(await apiRequest('/api/access/plans', { auth: true, signal })),

  adjustPoints: async (body: { userId: string; delta: number; reason: string; idempotencyKey: string }) =>
    ledgerSchema.parse(await apiRequest('/api/access/admin/points/adjust', { method: 'POST', auth: true, body })),

  grantSubscription: async (
    body: { userId: string; planId: string; durationDays: number; humanGradingCredits: number },
    idempotencyKey: string,
  ) =>
    subscriptionSchema.parse(await apiRequest('/api/access/admin/subscriptions/grant', {
      method: 'POST',
      auth: true,
      body,
      headers: { 'Idempotency-Key': idempotencyKey },
    })),
}
