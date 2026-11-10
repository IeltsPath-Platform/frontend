/** UI/API provider id. */
export type SocialProvider = 'Google'

export interface AuthTokenResponse {
  message: string
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  refreshExpiresIn: number
}

export interface MessageResponse {
  message: string
}

export interface RoleResponse {
  id?: string
  name: string
}

export interface UserResponse {
  id: string
  email: string
  fullName: string
  phoneNumber: string | null
  status: string
  roles: RoleResponse[]
  hasPassword?: boolean
  createdAt?: string
  updatedAt?: string
}
