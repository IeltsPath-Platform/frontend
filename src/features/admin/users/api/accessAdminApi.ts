import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'

const ledgerSchema = z.object({ id: z.string(), delta: z.number(), balanceAfter: z.number() })
export type PointAdjustment = z.infer<typeof ledgerSchema>

/**
 * Manual point corrections by an administrator. Each call carries a key made once per form, so a retry after a timeout
 * cannot apply the same change twice.
 */
export const accessAdminApi = {
  adjustPoints: async (body: { userId: string; delta: number; reason: string; idempotencyKey: string }) =>
    ledgerSchema.parse(await apiRequest('/api/access/admin/points/adjust', { method: 'POST', auth: true, body })),
}
