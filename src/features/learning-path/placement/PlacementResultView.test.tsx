import { act, render, screen, waitFor } from '@/test/render'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlacementResultView } from './PlacementResultView'

const api = vi.hoisted(() => ({ getPlacementResult: vi.fn(), getPlacementOptions: vi.fn(), listCourses: vi.fn(), getActiveLearningGoal: vi.fn() }))
vi.mock('../api', () => ({ learningApi: api }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => ({ userName: 'Learner' }) }))

const baseResult = {
  attemptId: 'attempt-1', overallBand: 3, completedAt: '2026-11-18T00:00:00Z', pool: 'BAND_0_3', ceiling: 3,
  reachedCeiling: true, partial: true, skills: [{ skill: 'LISTENING', band: 3 }, { skill: 'READING', band: 3 }, { skill: 'WRITING', band: 3 }], sections: [],
}
const options = { pools: [{ pool: 'BAND_0_3', examCount: 2 }, { pool: 'BAND_3_5', examCount: 2 }, { pool: 'BAND_5_9', examCount: 1 }], limitPer24h: 3, retakesLeft: 2, nextRetakeAt: null, hasPlacement: true, currentBand: 3, openAssignment: null }

function show(onRetake = vi.fn()) {
  render(<MemoryRouter><PlacementResultView attemptId="attempt-1" onRetake={onRetake} /></MemoryRouter>)
  return onRetake
}

describe('PlacementResultView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getPlacementResult.mockResolvedValue(baseResult)
    api.getPlacementOptions.mockResolvedValue(options)
    api.listCourses.mockResolvedValue([])
    api.getActiveLearningGoal.mockResolvedValue(null)
  })

  it('shows the pool ceiling, partial grading, missing skill, replacement note, and remaining retakes', async () => {
    const onRetake = show()
    expect(await screen.findByText(/Bạn đạt mức tối đa của kho Band 0–3/i)).toBeInTheDocument()
    expect(screen.getByText(/Kết quả bài làm này cập nhật band hiện tại của bạn/i)).toBeInTheDocument()
    expect(screen.getByText(/Một phần bài thi chưa thể chấm/i)).toBeInTheDocument()
    expect(screen.getByText('Chưa chấm')).toBeInTheDocument()
    screen.getByRole('button', { name: /Làm lại bài test đầu vào.*còn 2 lượt/i }).click()
    expect(onRetake).toHaveBeenCalledTimes(1)
  })

  it('does not suggest a higher pool for the highest pool', async () => {
    api.getPlacementResult.mockResolvedValue({ ...baseResult, pool: 'BAND_5_9', ceiling: 9, reachedCeiling: false })
    await show()
    expect(await screen.findByRole('heading', { name: 'Báo cáo kết quả bài test' })).toBeInTheDocument()
    expect(screen.queryByText(/Bạn đạt mức tối đa của kho/)).not.toBeInTheDocument()
  })

  it('waits for Learning to report the new band before loading recommended courses', async () => {
    let applyBand!: (value: typeof options) => void
    api.getPlacementOptions.mockResolvedValueOnce({ ...options, currentBand: 4.5 }).mockImplementationOnce(() => new Promise((resolve) => { applyBand = resolve }))
    show()
    await waitFor(() => expect(api.getPlacementOptions).toHaveBeenCalledTimes(2), { timeout: 4000 })
    expect(api.listCourses).not.toHaveBeenCalled()
    await act(async () => applyBand(options))
    await screen.findByRole('heading', { name: 'Báo cáo kết quả bài test' })
    expect(api.listCourses).toHaveBeenCalledTimes(1)
  })
})
