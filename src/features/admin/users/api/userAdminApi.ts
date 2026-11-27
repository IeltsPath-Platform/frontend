import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { userSchema, type CreateUserInput, type User, type UserStatus } from '../types'
import type { PageResult } from '../../lib/useInfiniteList'

const BASE = '/api/users'

const userPageSchema = z.object({ content: z.array(userSchema), page: z.number(), size: z.number(), totalElements: z.number(), totalPages: z.number() })

export async function listUsers(filter: { page: number; size: number; role?: string; status?: string; search?: string }, signal?: AbortSignal): Promise<PageResult<User>> {
  const params = new URLSearchParams({ page: String(filter.page), size: String(filter.size) })
  if (filter.role) params.set('role', filter.role)
  if (filter.status) params.set('status', filter.status)
  if (filter.search) params.set('search', filter.search)
  return userPageSchema.parse(await apiRequest<unknown>(`${BASE}?${params}`, { auth: true, signal }))
}

export async function listAllUsers(signal?: AbortSignal): Promise<User[]> {
  return z.array(userSchema).parse(await apiRequest<unknown>(`${BASE}/admin/all`, { auth: true, signal }))
}

export async function createUser(input: CreateUserInput): Promise<User> {
  return userSchema.parse(await apiRequest<unknown>(BASE, { method: 'POST', auth: true, body: input }))
}

export async function updateUser(id: string, input: { fullName: string; phoneNumber: string | null }): Promise<User> {
  return userSchema.parse(await apiRequest<unknown>(`${BASE}/${id}`, { method: 'PUT', auth: true, body: input }))
}

export async function updateUserRoles(id: string, roles: string[]): Promise<User> {
  return userSchema.parse(await apiRequest<unknown>(`${BASE}/${id}/roles`, { method: 'PUT', auth: true, body: { roles } }))
}

export async function updateUserStatus(id: string, status: UserStatus): Promise<User> {
  return userSchema.parse(await apiRequest<unknown>(`${BASE}/${id}/status`, { method: 'PUT', auth: true, body: { status } }))
}

export async function deleteUser(id: string): Promise<User> {
  return userSchema.parse(await apiRequest<unknown>(`${BASE}/${id}`, { method: 'DELETE', auth: true }))
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  await apiRequest<unknown>(`${BASE}/${id}/password`, { method: 'PUT', auth: true, body: { newPassword } })
}
