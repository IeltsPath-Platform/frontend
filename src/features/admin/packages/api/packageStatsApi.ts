import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { packageStatsSchema, type PackageStats } from '../types'

/** The server answers at most this many packages a call (see the Assessment package-stats contract). */
export const STATS_BATCH = 100

/**
 * Attempt counts and average band of the given packages, read from Assessment. Ids go out in batches of the server's
 * limit; a package nobody has attempted is simply absent from the answer.
 */
export async function listPackageStats(packageIds: readonly string[], signal?: AbortSignal): Promise<PackageStats[]> {
  const ids = [...new Set(packageIds.map((id) => z.guid().parse(id)))]
  const batches: string[][] = []
  for (let index = 0; index < ids.length; index += STATS_BATCH) batches.push(ids.slice(index, index + STATS_BATCH))
  const answers = await Promise.all(batches.map(async (batch) => {
    const params = new URLSearchParams()
    for (const id of batch) params.append('packageIds', id)
    return z.array(packageStatsSchema).parse(await apiRequest<unknown>(`/api/assessments/admin/package-stats?${params}`, { auth: true, signal }))
  }))
  return answers.flat()
}
