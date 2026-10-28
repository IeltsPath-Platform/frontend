import { z } from 'zod'
import { apiRequest, HttpError } from '@/lib/httpClient'

export const roleResponseSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
})

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  phoneNumber: z.string().nullable().optional(),
  status: z.string(),
  roles: z.array(roleResponseSchema).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type UserResponse = z.infer<typeof userResponseSchema>

export const learnerProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarReference: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  selfReportedBand: z.number().nullable().optional(),
  timezone: z.string().nullable().optional(),
  visibility: z.enum(['PUBLIC', 'COMMUNITY', 'PRIVATE']).default('PUBLIC'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type LearnerProfile = z.infer<typeof learnerProfileSchema>

export const learningGoalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  targetBand: z.number(),
  examDate: z.string().nullable().optional(),
  availableMinutesPerDay: z.number().default(30),
  status: z.enum(['ACTIVE', 'PAUSED', 'ACHIEVED', 'ABANDONED']).default('ACTIVE'),
  startedAt: z.string().optional(),
  endedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type LearningGoal = z.infer<typeof learningGoalSchema>

export const oauthIdentitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  provider: z.string(),
  providerSubject: z.string(),
  linkedAt: z.string().optional(),
  lastAuthenticatedAt: z.string().nullable().optional(),
})
export type OAuthIdentity = z.infer<typeof oauthIdentitySchema>

export const streakSchema = z.object({
  userId: z.string().optional(),
  currentDays: z.number().default(0),
  longestDays: z.number().default(0),
  lastQualifiedDate: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
})
export type StreakData = z.infer<typeof streakSchema>

export const AVATAR_MAX_SIZE = 2 * 1024 * 1024 // 2 MB
export const AVATAR_ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export class AvatarUploadError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AvatarUploadError'
    this.status = status
  }
}

export function validateAvatarFile(file: Blob | File): void {
  if (file.size <= 0) {
    throw new AvatarUploadError('Tệp ảnh đang trống.')
  }
  if (file.size > AVATAR_MAX_SIZE) {
    throw new AvatarUploadError('Tệp ảnh vượt quá dung lượng tối đa 2 MB.')
  }
  const type = file.type
  if (!AVATAR_ACCEPTED_TYPES.has(type)) {
    throw new AvatarUploadError('Định dạng ảnh không được hỗ trợ. Vui lòng chọn ảnh JPEG, PNG hoặc WebP.')
  }
}

function mapAvatarUploadError(error: unknown): AvatarUploadError {
  if (error instanceof AvatarUploadError) return error
  if (error instanceof HttpError) {
    const messages: Record<number, string> = {
      400: 'Tệp ảnh không hợp lệ hoặc bị lỗi. Vui lòng thử lại với ảnh khác.',
      413: 'Ảnh vượt quá dung lượng tối đa 2 MB.',
      415: 'Định dạng ảnh không được hỗ trợ (chỉ chấp nhận JPEG, PNG, WebP).',
      429: 'Bạn đã tải lên quá nhiều lần. Vui lòng chờ giây lát trước khi thử lại.',
      503: 'Dịch vụ lưu trữ ảnh tạm thời chưa khả dụng. Vui lòng thử lại sau.',
    }
    const body = error.body as { message?: string } | undefined
    return new AvatarUploadError(body?.message || messages[error.status] || 'Không thể tải ảnh lên. Vui lòng thử lại.', error.status)
  }
  return new AvatarUploadError('Không thể tải ảnh lên. Vui lòng kiểm tra kết nối và thử lại.')
}

export const profileApi = {
  getMe: async (): Promise<UserResponse> => {
    const raw = await apiRequest('/api/users/me', { auth: true })
    return userResponseSchema.parse(raw)
  },

  updateMe: async (body: { fullName: string; phoneNumber?: string | null }): Promise<UserResponse> => {
    const raw = await apiRequest('/api/users/me', {
      method: 'PUT',
      auth: true,
      body,
    })
    return userResponseSchema.parse(raw)
  },

  getProfile: async (): Promise<LearnerProfile> => {
    const raw = await apiRequest('/api/users/me/profile', { auth: true })
    return learnerProfileSchema.parse(raw)
  },

  updateProfile: async (body: {
    displayName: string
    avatarReference?: string | null
    bio?: string | null
    selfReportedBand?: number | null
    timezone?: string | null
    visibility?: 'PUBLIC' | 'COMMUNITY' | 'PRIVATE'
  }): Promise<LearnerProfile> => {
    const raw = await apiRequest('/api/users/me/profile', {
      method: 'PUT',
      auth: true,
      body,
    })
    return learnerProfileSchema.parse(raw)
  },

  uploadAvatar: async (file: Blob | File): Promise<LearnerProfile> => {
    try {
      validateAvatarFile(file)
      const formData = new FormData()
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const fileName = file instanceof File && file.name ? file.name : `avatar.${ext}`
      formData.append('file', file, fileName)

      const raw = await apiRequest('/api/users/me/avatar', {
        method: 'POST',
        auth: true,
        body: formData,
      })
      return learnerProfileSchema.parse(raw)
    } catch (error) {
      throw mapAvatarUploadError(error)
    }
  },

  deleteAvatar: async (): Promise<LearnerProfile> => {
    const raw = await apiRequest('/api/users/me/avatar', {
      method: 'DELETE',
      auth: true,
    })
    return learnerProfileSchema.parse(raw)
  },

  changePassword: async (body: { currentPassword: string; newPassword: string }): Promise<void> => {
    await apiRequest('/api/users/me/password', {
      method: 'POST',
      auth: true,
      body,
    })
  },

  getActiveGoal: async (): Promise<LearningGoal | null> => {
    try {
      const raw = await apiRequest('/api/users/me/learning-goals/active', { auth: true })
      return learningGoalSchema.parse(raw)
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        return null
      }
      throw error
    }
  },

  getGoals: async (): Promise<LearningGoal[]> => {
    const raw = await apiRequest('/api/users/me/learning-goals', { auth: true })
    return z.array(learningGoalSchema).parse(raw)
  },

  createGoal: async (body: {
    targetBand: number
    examDate?: string | null
    availableMinutesPerDay: number
  }): Promise<LearningGoal> => {
    const raw = await apiRequest('/api/users/me/learning-goals', {
      method: 'POST',
      auth: true,
      body,
    })
    return learningGoalSchema.parse(raw)
  },

  updateGoalStatus: async (goalId: string, status: 'ACTIVE' | 'PAUSED' | 'ACHIEVED' | 'ABANDONED'): Promise<LearningGoal> => {
    const raw = await apiRequest(`/api/users/me/learning-goals/${encodeURIComponent(goalId)}/status`, {
      method: 'PUT',
      auth: true,
      body: { status },
    })
    return learningGoalSchema.parse(raw)
  },

  getOAuthIdentities: async (): Promise<OAuthIdentity[]> => {
    const raw = await apiRequest('/api/users/me/oauth', { auth: true })
    return z.array(oauthIdentitySchema).parse(raw)
  },

  unlinkOAuthIdentity: async (provider: string): Promise<void> => {
    await apiRequest(`/api/users/me/oauth/${encodeURIComponent(provider)}`, {
      method: 'DELETE',
      auth: true,
    })
  },

  getStreak: async (): Promise<StreakData> => {
    try {
      const raw = await apiRequest('/api/learning-support/streak', { auth: true })
      return streakSchema.parse(raw)
    } catch {
      return { currentDays: 0, longestDays: 0 }
    }
  },
}
