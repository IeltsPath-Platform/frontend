export const ROLE_NAMES = [
  "ADMIN",
  "CUSTOMER",
  "CONTENT_AUTHOR",
  "EXAMINER",
  "SALES_STAFF",
] as const

export type RoleName = (typeof ROLE_NAMES)[number]

export interface Role {
  id: string
  name: RoleName
}

export type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION"
export type MembershipTier = "FREE" | "PREMIUM"

export interface User {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
  targetBand: number
  roles: RoleName[]
  status: UserStatus
  tier?: MembershipTier
  points?: number
}
