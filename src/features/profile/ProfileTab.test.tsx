import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfileTab } from './ProfileTab'
import { ToastContext } from '@/components/toast/toastContext'
import { HttpError } from '@/lib/httpClient'

const { profileApiMock } = vi.hoisted(() => ({
  profileApiMock: {
    getMe: vi.fn(),
    updateMe: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    deleteAvatar: vi.fn(),
    changePassword: vi.fn(),
    getActiveGoal: vi.fn(),
    getGoals: vi.fn(),
    createGoal: vi.fn(),
    updateGoalStatus: vi.fn(),
    getOAuthIdentities: vi.fn(),
    unlinkOAuthIdentity: vi.fn(),
    getStreak: vi.fn(),
  },
}))

vi.mock('./api/profileApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/profileApi')>()
  return {
    ...actual,
    profileApi: profileApiMock,
  }
})

const mockUser = {
  id: '10000000-0000-0000-0000-000000000001',
  email: 'learner@ieltspath.com',
  fullName: 'Nguyễn Văn Học',
  phoneNumber: '0912345678',
  status: 'ACTIVE',
  roles: [{ id: 'role-1', name: 'CUSTOMER' }],
  createdAt: '2026-10-01T08:00:00Z',
}

const mockProfile = {
  userId: '10000000-0000-0000-0000-000000000001',
  displayName: 'Học Pro',
  avatarReference: 'https://storage.ieltspath.com/avatars/hoc.png',
  bio: 'Mục tiêu đạt 7.5 IELTS trong năm nay.',
  selfReportedBand: 6.0,
  timezone: 'Asia/Ho_Chi_Minh',
  visibility: 'PUBLIC' as const,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-15T08:00:00Z',
}

const mockActiveGoal = {
  id: 'goal-1',
  userId: '10000000-0000-0000-0000-000000000001',
  targetBand: 7.5,
  examDate: '2026-12-25',
  availableMinutesPerDay: 45,
  status: 'ACTIVE' as const,
}

const mockStreak = {
  currentDays: 7,
  longestDays: 15,
}

function renderWithToast(ui: React.ReactElement) {
  const mockToast = vi.fn()
  const mockDismiss = vi.fn()
  return {
    ...render(
      <ToastContext.Provider value={{ toast: mockToast, dismiss: mockDismiss }}>
        {ui}
      </ToastContext.Provider>
    ),
    mockToast,
  }
}

describe('ProfileTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profileApiMock.getMe.mockResolvedValue(mockUser)
    profileApiMock.getProfile.mockResolvedValue(mockProfile)
    profileApiMock.getActiveGoal.mockResolvedValue(mockActiveGoal)
    profileApiMock.getGoals.mockResolvedValue([mockActiveGoal])
    profileApiMock.getOAuthIdentities.mockResolvedValue([])
    profileApiMock.getStreak.mockResolvedValue(mockStreak)
  })

  it('renders initial user profile and chips correctly', async () => {
    renderWithToast(<ProfileTab />)

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Học Pro' })).toBeInTheDocument()
    })

    expect(screen.getByText('learner@ieltspath.com')).toBeInTheDocument()
    expect(screen.getByText('Học viên')).toBeInTheDocument()
    expect(screen.getByText('Nguyễn Văn Học')).toBeInTheDocument()
    expect(screen.getByText('0912345678')).toBeInTheDocument()
    expect(screen.getByText('Mục tiêu đạt 7.5 IELTS trong năm nay.')).toBeInTheDocument()
  })

  it('preserves existing avatarReference when updating personal info', async () => {
    profileApiMock.updateMe.mockResolvedValue({
      ...mockUser,
      fullName: 'Nguyễn Văn Đạt',
    })
    profileApiMock.updateProfile.mockResolvedValue({
      ...mockProfile,
      displayName: 'Đạt IELTS',
    })

    renderWithToast(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa')).toBeInTheDocument()
    })

    // Click edit toggle
    fireEvent.click(screen.getByText('Chỉnh sửa'))

    // Wait for edit inputs to appear
    const displayNameInput = await screen.findByPlaceholderText('Ví dụ: Alex Nguyễn')
    fireEvent.change(displayNameInput, { target: { value: 'Đạt IELTS' } })

    const fullNameInput = screen.getByPlaceholderText('Ví dụ: Nguyễn Văn Alex')
    fireEvent.change(fullNameInput, { target: { value: 'Nguyễn Văn Đạt' } })

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Lưu thay đổi/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(profileApiMock.updateProfile).toHaveBeenCalled()
    })

    // CRITICAL: verify avatarReference was sent back and NOT wiped!
    expect(profileApiMock.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'Đạt IELTS',
        avatarReference: 'https://storage.ieltspath.com/avatars/hoc.png',
      })
    )

    expect(profileApiMock.updateMe).toHaveBeenCalledWith({
      fullName: 'Nguyễn Văn Đạt',
      phoneNumber: '0912345678',
    })
  })

  it('displays error when changing password with incorrect current password', async () => {
    profileApiMock.changePassword.mockRejectedValue(
      new HttpError(400, 'Bad Request', { message: 'Mật khẩu hiện tại không chính xác' })
    )

    renderWithToast(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByText('Bảo mật tài khoản')).toBeInTheDocument()
    })

    // Fill password form
    const currentPassInput = screen.getByPlaceholderText('Nhập mật khẩu hiện tại')
    const newPassInput = screen.getByPlaceholderText('Từ 6 đến 72 ký tự')
    const confirmPassInput = screen.getByPlaceholderText('Nhập lại mật khẩu mới')

    fireEvent.change(currentPassInput, { target: { value: 'wrongpass123' } })
    fireEvent.change(newPassInput, { target: { value: 'newpassword123' } })
    fireEvent.change(confirmPassInput, { target: { value: 'newpassword123' } })

    const changeBtn = screen.getByRole('button', { name: /Cập nhật mật khẩu/i })
    fireEvent.click(changeBtn)

    await waitFor(() => {
      expect(screen.getByText(/Mật khẩu hiện tại không chính xác/i)).toBeInTheDocument()
    })
  })

  it('confirms and deletes avatar when user clicks delete in Danger Zone', async () => {
    profileApiMock.deleteAvatar.mockResolvedValue({
      ...mockProfile,
      avatarReference: null,
    })

    renderWithToast(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByText('Vùng quản lý nâng cao')).toBeInTheDocument()
    })

    // Click delete avatar button in Danger Zone
    const deleteBtn = screen.getByRole('button', { name: 'Xóa ảnh đại diện' })
    fireEvent.click(deleteBtn)

    // Confirm modal opens
    expect(screen.getByText(/Xác nhận xóa ảnh đại diện\?/i)).toBeInTheDocument()

    // Click confirm in modal
    const confirmBtn = screen.getByRole('button', { name: 'Xác nhận xóa' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(profileApiMock.deleteAvatar).toHaveBeenCalled()
    })
  })

  it('shows error state with retry button when initial loading fails', async () => {
    profileApiMock.getMe.mockRejectedValue(new HttpError(500, 'Internal Server Error'))
    profileApiMock.getProfile.mockRejectedValue(new HttpError(500, 'Internal Server Error'))

    renderWithToast(<ProfileTab />)

    await waitFor(() => {
      expect(screen.getByText(/Không thể tải thông tin hồ sơ/i)).toBeInTheDocument()
    })

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i })
    expect(retryBtn).toBeInTheDocument()

    // Test clicking retry
    profileApiMock.getMe.mockResolvedValue(mockUser)
    profileApiMock.getProfile.mockResolvedValue(mockProfile)
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(profileApiMock.getMe).toHaveBeenCalledTimes(2)
    })
  })
})

