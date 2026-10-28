import { useCallback, useEffect, useState } from 'react'
import {
  profileApi,
  type LearnerProfile,
  type LearningGoal,
  type OAuthIdentity,
  type ProfileVisibilityChoice,
  type StreakData,
  type UserResponse,
} from '../api/profileApi'
import { updateAuthUserProfile } from '@/features/auth/authSession'
import { HttpError } from '@/lib/httpClient'

export interface SavePersonalInfoInput {
  fullName: string
  phoneNumber?: string | null
  displayName: string
  bio?: string | null
  selfReportedBand?: number | null
  timezone?: string | null
}

export interface SavePersonalInfoResult {
  userUpdated: boolean
  profileUpdated: boolean
  errorMessage?: string
  fieldErrors?: {
    phoneNumber?: string
    displayName?: string
    fullName?: string
    bio?: string
    selfReportedBand?: string
  }
}

export function useProfile() {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [activeGoal, setActiveGoal] = useState<LearningGoal | null>(null)
  const [goals, setGoals] = useState<LearningGoal[]>([])
  const [oauthIdentities, setOauthIdentities] = useState<OAuthIdentity[]>([])
  const [streak, setStreak] = useState<StreakData | null>(null)

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false)
  const [reloadKey, setReloadKey] = useState<number>(0)

  useEffect(() => {
    let active = true

    async function fetchInitialProfile() {
      try {
        const [u, p, ag, gList, oauth, strk] = await Promise.all([
          profileApi.getMe(),
          profileApi.getProfile(),
          profileApi.getActiveGoal(),
          profileApi.getGoals().catch(() => []),
          profileApi.getOAuthIdentities().catch(() => []),
          profileApi.getStreak().catch(() => ({ currentDays: 0, longestDays: 0 })),
        ])

        if (active) {
          setUser(u)
          setProfile(p)
          setActiveGoal(ag)
          setGoals(gList)
          setOauthIdentities(oauth)
          setStreak(strk)
          setError(null)
          setLoading(false)
        }
      } catch (err) {
        if (active) {
          const msg = err instanceof HttpError
            ? err.message || `Lỗi tải thông tin (${err.status})`
            : 'Không thể kết nối đến máy chủ. Vui lòng thử lại.'
          setError(msg)
          setLoading(false)
        }
      }
    }

    void fetchInitialProfile()

    return () => {
      active = false
    }
  }, [reloadKey])

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadKey((k) => k + 1)
  }, [])

  const savePersonalInfo = useCallback(async (input: SavePersonalInfoInput): Promise<SavePersonalInfoResult> => {
    let userUpdated = false
    let profileUpdated = false
    const fieldErrors: SavePersonalInfoResult['fieldErrors'] = {}

    // 1. Update /api/users/me
    let userError: unknown = null
    try {
      const updatedUser = await profileApi.updateMe({
        fullName: input.fullName.trim(),
        phoneNumber: input.phoneNumber?.trim() || null,
      })
      setUser(updatedUser)
      updateAuthUserProfile({ userName: updatedUser.fullName })
      userUpdated = true
    } catch (err) {
      userError = err
      if (err instanceof HttpError) {
        if (err.status === 409) {
          fieldErrors.phoneNumber = 'Số điện thoại này đã được sử dụng bởi một tài khoản khác.'
        } else {
          const body = err.body as { message?: string; details?: Record<string, string> } | undefined
          if (body?.details?.phoneNumber) {
            fieldErrors.phoneNumber = body.details.phoneNumber
          }
          if (body?.details?.fullName) {
            fieldErrors.fullName = body.details.fullName
          }
        }
      }
    }

    // 2. Update /api/users/me/profile
    // The avatar is not sent: only upload and delete change it, so editing text cannot lose it.
    let profileError: unknown = null
    try {
      const updatedProfile = await profileApi.updateProfile({
        displayName: input.displayName.trim(),
        bio: input.bio?.trim() || null,
        selfReportedBand: input.selfReportedBand ?? null,
        timezone: input.timezone?.trim() || null,
        // A stored COMMUNITY profile cannot be re-sent; leaving the value out keeps it as it is.
        visibility: profile?.visibility === 'PUBLIC' || profile?.visibility === 'PRIVATE' ? profile.visibility : undefined,
      })
      setProfile(updatedProfile)
      profileUpdated = true
    } catch (err) {
      profileError = err
      if (err instanceof HttpError) {
        const body = err.body as { message?: string; details?: Record<string, string> } | undefined
        if (body?.details?.displayName) {
          fieldErrors.displayName = body.details.displayName
        }
        if (body?.details?.bio) {
          fieldErrors.bio = body.details.bio
        }
        if (body?.details?.selfReportedBand) {
          fieldErrors.selfReportedBand = body.details.selfReportedBand
        }
      }
    }

    // Evaluate result
    if (userUpdated && profileUpdated) {
      window.dispatchEvent(new CustomEvent('user-profile-updated'))
      return { userUpdated: true, profileUpdated: true }
    }

    if (!userUpdated && !profileUpdated) {
      const message =
        fieldErrors.phoneNumber ||
        (userError instanceof Error ? userError.message : null) ||
        (profileError instanceof Error ? profileError.message : null) ||
        'Không thể lưu thông tin cá nhân. Vui lòng kiểm tra lại.'
      return { userUpdated: false, profileUpdated: false, errorMessage: message, fieldErrors }
    }

    if (userUpdated && !profileUpdated) {
      return {
        userUpdated: true,
        profileUpdated: false,
        errorMessage: 'Đã lưu họ tên và số điện thoại, nhưng lưu thông tin hồ sơ thất bại.',
        fieldErrors,
      }
    }

    return {
      userUpdated: false,
      profileUpdated: true,
      errorMessage: 'Đã lưu thông tin hồ sơ, nhưng cập nhật họ tên/số điện thoại thất bại.',
      fieldErrors,
    }
  }, [profile])

  const uploadAvatar = useCallback(async (file: Blob | File): Promise<LearnerProfile> => {
    setIsUploadingAvatar(true)
    try {
      const updatedProfile = await profileApi.uploadAvatar(file)
      setProfile(updatedProfile)
      updateAuthUserProfile({ avatarUrl: updatedProfile.avatarReference || null })
      window.dispatchEvent(new CustomEvent('user-profile-updated'))
      return updatedProfile
    } finally {
      setIsUploadingAvatar(false)
    }
  }, [])

  const deleteAvatar = useCallback(async (): Promise<LearnerProfile> => {
    setIsUploadingAvatar(true)
    try {
      const updatedProfile = await profileApi.deleteAvatar()
      setProfile(updatedProfile)
      updateAuthUserProfile({ avatarUrl: null })
      window.dispatchEvent(new CustomEvent('user-profile-updated'))
      return updatedProfile
    } finally {
      setIsUploadingAvatar(false)
    }
  }, [])

  const updateVisibility = useCallback(async (visibility: ProfileVisibilityChoice): Promise<LearnerProfile> => {
    if (!profile) throw new Error('Hồ sơ chưa được tải')
    const updated = await profileApi.updateProfile({
      displayName: profile.displayName,
      bio: profile.bio,
      selfReportedBand: profile.selfReportedBand,
      timezone: profile.timezone,
      visibility,
    })
    setProfile(updated)
    return updated
  }, [profile])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
    await profileApi.changePassword({ currentPassword, newPassword })
  }, [])

  const createGoal = useCallback(async (targetBand: number, examDate?: string | null, availableMinutesPerDay = 30): Promise<LearningGoal> => {
    const newGoal = await profileApi.createGoal({
      targetBand,
      examDate,
      availableMinutesPerDay,
    })
    setActiveGoal(newGoal)
    const list = await profileApi.getGoals().catch(() => [newGoal])
    setGoals(list)
    return newGoal
  }, [])

  const updateGoalStatus = useCallback(async (goalId: string, status: 'ACTIVE' | 'PAUSED' | 'ACHIEVED' | 'ABANDONED'): Promise<LearningGoal> => {
    const updated = await profileApi.updateGoalStatus(goalId, status)
    if (status === 'ACTIVE') {
      setActiveGoal(updated)
    } else if (activeGoal?.id === goalId) {
      setActiveGoal(null)
    }
    const list = await profileApi.getGoals().catch(() => [])
    setGoals(list)
    return updated
  }, [activeGoal])

  const unlinkOAuth = useCallback(async (provider: string): Promise<void> => {
    await profileApi.unlinkOAuthIdentity(provider)
    setOauthIdentities((prev) => prev.filter((item) => item.provider.toLowerCase() !== provider.toLowerCase()))
  }, [])

  return {
    user,
    profile,
    activeGoal,
    goals,
    oauthIdentities,
    streak,
    loading,
    error,
    isUploadingAvatar,
    reload,
    savePersonalInfo,
    uploadAvatar,
    deleteAvatar,
    updateVisibility,
    changePassword,
    createGoal,
    updateGoalStatus,
    unlinkOAuth,
  }
}

