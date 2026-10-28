import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { profileSchema, summarySchema, type ProfileInput } from '../types'

export async function getExaminerSummary(signal?: AbortSignal) {
  return summarySchema.parse(await apiRequest<unknown>('/api/assessments/examiners/me/summary', { auth: true, signal }))
}

export async function getMyExaminerProfile(userId: string, signal?: AbortSignal) {
  return profileSchema.parse(await apiRequest<unknown>(`/api/users/examiners/${z.guid().parse(userId)}`, { auth: true, signal }))
}

/** Replaces band, certificates and whether new submissions are taken; answers with the saved profile. */
export async function saveExaminerProfile(input: ProfileInput) {
  return profileSchema.parse(await apiRequest<unknown>('/api/users/me/examiner-profile', { auth: true, method: 'PUT', body: input }))
}
