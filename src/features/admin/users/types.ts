import { z } from 'zod'

export const USER_ROLES = ['ADMIN', 'CUSTOMER', 'CONTENT_AUTHOR', 'EXAMINER', 'SALES_STAFF'] as const
export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'LOCKED', 'PENDING_VERIFY'] as const
export const CHANGEABLE_USER_STATUSES = ['ACTIVE', 'INACTIVE', 'LOCKED'] as const

export type UserRole = (typeof USER_ROLES)[number]
export type UserStatus = (typeof USER_STATUSES)[number]

export const roleSchema = z.object({
  id: z.string(),
  name: z.enum(USER_ROLES),
  description: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  phoneNumber: z.string().nullable().optional(),
  status: z.enum(USER_STATUSES),
  roles: z.array(roleSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type User = z.infer<typeof userSchema>
export type CreateUserInput = {
  email: string
  password: string
  fullName: string
  phoneNumber?: string
  roles: UserRole[]
}
