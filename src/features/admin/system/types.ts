import { z } from 'zod'

export const serviceInstanceSchema = z.object({
  instanceId: z.string(),
  uri: z.string(),
  status: z.enum(['UP', 'DOWN', 'OUT_OF_SERVICE', 'UNKNOWN']),
  responseMs: z.number().nullable().optional(),
})

export const serviceSchema = z.object({
  serviceId: z.string(),
  status: z.enum(['UP', 'DOWN']),
  instances: z.array(serviceInstanceSchema),
})

export const serviceSnapshotSchema = z.object({
  checkedAt: z.string(),
  services: z.array(serviceSchema),
})

export const dailyActivitySchema = z.object({
  day: z.string(),
  dau: z.number(),
  wau: z.number(),
  mau: z.number(),
})

export const retentionSchema = z.object({
  weekStart: z.string(),
  size: z.number(),
  week1: z.number().nullable(),
  week2: z.number().nullable(),
  week4: z.number().nullable(),
  week8: z.number().nullable(),
})

export const activityStatsSchema = z.object({
  from: z.string(),
  to: z.string(),
  daily: z.array(dailyActivitySchema),
  retention: z.array(retentionSchema),
})

export type ServiceInstance = z.infer<typeof serviceInstanceSchema>
export type Service = z.infer<typeof serviceSchema>
export type ServiceSnapshot = z.infer<typeof serviceSnapshotSchema>
export type DailyActivity = z.infer<typeof dailyActivitySchema>
export type Retention = z.infer<typeof retentionSchema>
export type ActivityStats = z.infer<typeof activityStatsSchema>
export interface DateRange { from: string; to: string }
