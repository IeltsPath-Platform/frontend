import { fireEvent, render, screen, waitFor } from '@/test/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { learningApi } from '../api'
import { ApiError } from '../api'
import type { CourseSummary } from '~types/learningPath'
import { UnlockDialog } from './UnlockDialog'

const wallet = vi.hoisted(() => ({ check: vi.fn(), onActivated: vi.fn() }))
vi.mock('@/features/practice/writing/useWritingWallet', () => ({
  useWritingWallet: () => ({ balance: 150, isLoggedIn: true, client: undefined, check: wallet.check, onActivated: wallet.onActivated }),
}))
vi.mock('@/features/home/components/KeyActivationDialog', () => ({ KeyActivationDialog: () => null }))

const course: CourseSummary = {
  id: 'course-1', code: 'B1', title: 'Band 5', bandLevel: 5, topicCount: 1, passedTopicCount: 0,
  completedLessons: 0, totalLessons: 12, lastStudiedAt: null, recommended: false, testStatus: 'LOCKED',
  skillUnlockPoints: { LISTENING: 100 }, comboPayablePoints: 125, unlockedSkills: [], comboUnlocked: false,
}

describe('UnlockDialog', () => {
  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => {
    wallet.check.mockReset().mockResolvedValue(150)
    wallet.onActivated.mockReset()
    vi.spyOn(learningApi, 'listCourses').mockResolvedValue([course])
  })

  it('shows the server net combo price and protects a purchase from double click', async () => {
    const unlock = vi.spyOn(learningApi, 'unlockCourse').mockResolvedValue({ courseId: course.id, target: 'COMBO', pointCost: 125, status: 'ACTIVE', ledgerEntryId: 'ledger-1' })
    const onClose = vi.fn()
    render(<UnlockDialog courseId={course.id} target="COMBO" onClose={onClose} onChanged={vi.fn()} />)
    expect(await screen.findByText('125 Points')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Mở khóa bằng Points' })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(unlock).toHaveBeenCalledOnce())
    expect(unlock).toHaveBeenCalledWith(course.id, 'COMBO', expect.any(String))
    expect(onClose).toHaveBeenCalledOnce()
    unlock.mockRestore()
  })

  it('reuses the idempotency key after an uncertain response', async () => {
    const unlock = vi.spyOn(learningApi, 'unlockCourse')
      .mockRejectedValueOnce(new ApiError(503, 'SERVER_ERROR', 'Unavailable'))
      .mockResolvedValueOnce({ courseId: course.id, target: 'COMBO', pointCost: 125, status: 'ACTIVE', ledgerEntryId: 'ledger-1' })
    const onClose = vi.fn()
    render(<UnlockDialog courseId={course.id} target="COMBO" onClose={onClose} onChanged={vi.fn()} />)
    const button = await screen.findByRole('button', { name: 'Mở khóa bằng Points' })
    fireEvent.click(button)
    expect(await screen.findByText(/Đang xác nhận giao dịch/)).toBeInTheDocument()
    fireEvent.click(button)
    await waitFor(() => expect(unlock).toHaveBeenCalledTimes(2))
    expect(unlock.mock.calls[1]?.[2]).toBe(unlock.mock.calls[0]?.[2])
    expect(onClose).toHaveBeenCalledOnce()
  })
})
