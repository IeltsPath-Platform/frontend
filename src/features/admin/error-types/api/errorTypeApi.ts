import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { errorTypeSchema, type ErrorTypeCreate, type ErrorTypeUpdate } from '../types'

const PATH = '/api/content/error-types'
export async function fetchErrorTypes(signal?: AbortSignal) {
  return z.array(errorTypeSchema).parse(await apiRequest<unknown>(`${PATH}?activeOnly=false`, { auth: true, signal }))
}
export async function createErrorType(body: ErrorTypeCreate) {
  return errorTypeSchema.parse(await apiRequest<unknown>(PATH, { auth: true, method: 'POST', body }))
}
export async function updateErrorType(id: string, body: ErrorTypeUpdate) {
  return errorTypeSchema.parse(await apiRequest<unknown>(`${PATH}/${id}`, { auth: true, method: 'PUT', body }))
}
