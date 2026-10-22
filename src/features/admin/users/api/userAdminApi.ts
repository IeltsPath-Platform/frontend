import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { userSchema, type CreateUserInput, type User, type UserStatus } from '../types'

const BASE = '/api/users'

export async function listUsers(signal?: AbortSignal): Promise<User[]> {
  return z.array(userSchema).parse(await apiRequest<unknown>(BASE, { auth: true, signal }))
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
