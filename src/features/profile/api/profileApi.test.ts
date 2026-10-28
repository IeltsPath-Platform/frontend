import { describe, expect, it } from 'vitest'
import {
  validateAvatarFile,
  AvatarUploadError,
  userResponseSchema,
  learnerProfileSchema,
  learningGoalSchema,
  oauthIdentitySchema,
  streakSchema,
} from './profileApi'

describe('profileApi schemas & validation', () => {
  it('parses valid UserResponse schema', () => {
    const raw = {
      id: '10000000-0000-0000-0000-000000000001',
      email: 'learner@ieltspath.com',
      fullName: 'Nguyễn Văn Học',
      phoneNumber: '0912345678',
      status: 'ACTIVE',
      roles: [{ id: 'role-1', name: 'CUSTOMER' }],
      createdAt: '2026-10-01T08:00:00Z',
    }
    const user = userResponseSchema.parse(raw)
    expect(user.fullName).toBe('Nguyễn Văn Học')
    expect(user.phoneNumber).toBe('0912345678')
    expect(user.roles[0].name).toBe('CUSTOMER')
  })

  it('parses valid LearnerProfile schema with all 3 visibility states', () => {
    const p1 = learnerProfileSchema.parse({
      userId: '10000000-0000-0000-0000-000000000001',
      displayName: 'Alex',
      avatarReference: 'https://storage.ieltspath.com/avatars/alex.png',
      bio: 'Ready to master IELTS',
      selfReportedBand: 6.5,
      timezone: 'Asia/Ho_Chi_Minh',
      visibility: 'PUBLIC',
    })
    expect(p1.visibility).toBe('PUBLIC')

    const p2 = learnerProfileSchema.parse({
      userId: '10000000-0000-0000-0000-000000000001',
      displayName: 'Alex',
      visibility: 'COMMUNITY',
    })
    expect(p2.visibility).toBe('COMMUNITY')

    const p3 = learnerProfileSchema.parse({
      userId: '10000000-0000-0000-0000-000000000001',
      displayName: 'Alex',
      visibility: 'PRIVATE',
    })
    expect(p3.visibility).toBe('PRIVATE')
  })

  it('parses valid LearningGoal and Streak schemas', () => {
    const goal = learningGoalSchema.parse({
      id: 'goal-1',
      userId: '10000000-0000-0000-0000-000000000001',
      targetBand: 7.5,
      examDate: '2026-12-30',
      availableMinutesPerDay: 45,
      status: 'ACTIVE',
    })
    expect(goal.targetBand).toBe(7.5)
    expect(goal.status).toBe('ACTIVE')

    const streak = streakSchema.parse({
      currentDays: 14,
      longestDays: 30,
    })
    expect(streak.currentDays).toBe(14)
    expect(streak.longestDays).toBe(30)
  })

  it('parses OAuth identity list schema', () => {
    const identity = oauthIdentitySchema.parse({
      id: 'oauth-1',
      userId: '10000000-0000-0000-0000-000000000001',
      provider: 'Google',
      providerSubject: 'sub-123456',
      linkedAt: '2026-10-10T10:00:00Z',
    })
    expect(identity.provider).toBe('Google')
  })

  describe('validateAvatarFile', () => {
    it('throws when file is empty', () => {
      const emptyBlob = new Blob([], { type: 'image/png' })
      expect(() => validateAvatarFile(emptyBlob)).toThrow(AvatarUploadError)
      expect(() => validateAvatarFile(emptyBlob)).toThrow(/trống/)
    })

    it('throws when file exceeds 2 MB', () => {
      // 2 MB + 1 byte
      const bigBuffer = new Uint8Array(2 * 1024 * 1024 + 1)
      const bigBlob = new Blob([bigBuffer], { type: 'image/jpeg' })
      expect(() => validateAvatarFile(bigBlob)).toThrow(AvatarUploadError)
      expect(() => validateAvatarFile(bigBlob)).toThrow(/2 MB/)
    })

    it('throws when file type is not supported (e.g. gif or pdf)', () => {
      const gifBlob = new Blob(['sample-data'], { type: 'image/gif' })
      expect(() => validateAvatarFile(gifBlob)).toThrow(AvatarUploadError)
      expect(() => validateAvatarFile(gifBlob)).toThrow(/JPEG, PNG hoặc WebP/)

      const pdfBlob = new Blob(['sample-data'], { type: 'application/pdf' })
      expect(() => validateAvatarFile(pdfBlob)).toThrow(AvatarUploadError)
    })

    it('accepts valid jpeg, png, and webp blobs under 2 MB', () => {
      const validPng = new Blob(['valid-png-data'], { type: 'image/png' })
      const validJpg = new Blob(['valid-jpg-data'], { type: 'image/jpeg' })
      const validWebp = new Blob(['valid-webp-data'], { type: 'image/webp' })

      expect(() => validateAvatarFile(validPng)).not.toThrow()
      expect(() => validateAvatarFile(validJpg)).not.toThrow()
      expect(() => validateAvatarFile(validWebp)).not.toThrow()
    })
  })
})
