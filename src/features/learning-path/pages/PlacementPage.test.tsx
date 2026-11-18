import { fireEvent, render, screen, waitFor } from '@/test/render'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlacementPage } from './PlacementPage'

const api = vi.hoisted(() => ({
  getCurrentPlacementAttempt: vi.fn(), getPlacementOptions: vi.fn(), assignPlacementTest: vi.fn(),
  releasePlacementAssignment: vi.fn(), createAttempt: vi.fn(), cancelAttempt: vi.fn(),
  getPlacementResult: vi.fn(),
}))
vi.mock('../api', () => ({ learningApi: api, toApiError: (error: unknown) => error }))
vi.mock('../placement/PlacementSurvey', () => ({ PlacementSurvey: ({ onContinue }: { onContinue: () => void }) => <button onClick={onContinue} type="button">Finish survey</button> }))
vi.mock('../placement/PlacementResultView', () => ({ PlacementResultView: ({ onRetake }: { onRetake: () => void }) => <button onClick={onRetake} type="button">Retake</button> }))

const options = {
  pools: [{ pool: 'BAND_0_3', examCount: 1 }, { pool: 'BAND_3_5', examCount: 2 }, { pool: 'BAND_5_9', examCount: 1 }],
  limitPer24h: 3, retakesLeft: 2, nextRetakeAt: null, hasPlacement: false, currentBand: null, openAssignment: null,
}
const attempt = {
  id: 'attempt-1', userId: 'user-1', packageVersionId: 'version-1', attemptType: 'PLACEMENT_TEST', mode: 'STANDARD', channel: 'WEB',
  status: 'IN_PROGRESS' as const, startedAt: '2026-11-18T00:00:00Z', submittedAt: null, expiresAt: null, rowVersion: 0,
  createdAt: '2026-11-18T00:00:00Z', updatedAt: '2026-11-18T00:00:00Z',
}

function show() { render(<MemoryRouter><PlacementPage /></MemoryRouter>) }

describe('PlacementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCurrentPlacementAttempt.mockResolvedValue(null)
    api.getPlacementOptions.mockResolvedValue(options)
    api.assignPlacementTest.mockResolvedValue({ assignmentId: 'assignment-1', pool: 'BAND_3_5', packageId: 'package-1', packageVersionId: 'version-1', retakesLeft: 1, nextRetakeAt: null })
    api.releasePlacementAssignment.mockResolvedValue(undefined)
    api.createAttempt.mockResolvedValue(attempt)
    api.cancelAttempt.mockResolvedValue(undefined)
    api.getPlacementResult.mockResolvedValue({})
  })

  it('moves first-time learners from the survey to the picker without creating an attempt', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Finish survey' }))
    expect(await screen.findByRole('heading', { name: 'Chọn kho đề đầu vào' })).toBeInTheDocument()
    expect(api.createAttempt).not.toHaveBeenCalled()
    expect(api.assignPlacementTest).not.toHaveBeenCalled()
  })

  it('creates the attempt only after pool confirmation and releases an assignment if starting fails', async () => {
    api.createAttempt.mockRejectedValueOnce(new Error('Assessment unavailable'))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Finish survey' }))
    fireEvent.click(await screen.findByRole('button', { name: /3–5.*2 đề/i }))
    expect(api.createAttempt).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu làm bài' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Assessment unavailable')
    expect(api.assignPlacementTest).toHaveBeenCalledWith('BAND_3_5')
    expect(api.createAttempt).toHaveBeenCalledWith(expect.objectContaining({ packageVersionId: 'version-1', attemptType: 'PLACEMENT_TEST' }))
    expect(api.releasePlacementAssignment).toHaveBeenCalledWith('assignment-1')
  })

  it('resumes or cancels an in-progress attempt and returns to pool selection', async () => {
    api.getCurrentPlacementAttempt.mockResolvedValue(attempt)
    api.getPlacementOptions.mockResolvedValue({
      ...options,
      openAssignment: { assignmentId: 'attempt-assignment', pool: 'BAND_3_5', packageId: 'package-1', packageVersionId: 'version-1', retakesLeft: 1, nextRetakeAt: null },
    })
    api.releasePlacementAssignment.mockRejectedValueOnce(Object.assign(new Error('Already released'), { code: 'PLACEMENT_ASSIGNMENT_NOT_FOUND', status: 404 }))
    show()
    expect(await screen.findByRole('button', { name: 'Tiếp tục' })).toBeInTheDocument()
    await waitFor(() => expect(api.getPlacementOptions).toHaveBeenCalledTimes(1))
    await api.getPlacementOptions.mock.results[0].value
    fireEvent.click(screen.getByRole('button', { name: 'Hủy lượt thi này' }))
    await waitFor(() => expect(api.cancelAttempt).toHaveBeenCalledWith('attempt-1'))
    expect(api.releasePlacementAssignment).toHaveBeenCalledWith('attempt-assignment')
    expect(api.cancelAttempt.mock.invocationCallOrder[0]).toBeLessThan(api.releasePlacementAssignment.mock.invocationCallOrder[0])
    await waitFor(() => expect(api.getPlacementOptions).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('heading', { name: 'Chọn kho đề đầu vào' })).toBeInTheDocument()
  })

  it('opens the result with a retake entry and skips the survey for an existing placement', async () => {
    api.getCurrentPlacementAttempt.mockResolvedValue({ ...attempt, status: 'SUBMITTED' })
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Retake' }))
    expect(await screen.findByRole('heading', { name: 'Chọn kho đề đầu vào' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Finish survey' })).not.toBeInTheDocument()
  })

  it('shows the remaining-window message when Assessment refuses an attempt at the retake limit', async () => {
    api.getPlacementOptions.mockResolvedValue({ ...options, retakesLeft: 1, nextRetakeAt: '2026-11-19T00:30:00Z' })
    api.createAttempt.mockRejectedValueOnce(Object.assign(new Error('Limit reached'), { code: 'PLACEMENT_LIMIT_REACHED', status: 429 }))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Finish survey' }))
    fireEvent.click(await screen.findByRole('button', { name: /3–5.*2 đề/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu làm bài' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Bạn đã dùng hết lượt làm lại trong 24 giờ.*19\/11/i)
    expect(api.releasePlacementAssignment).toHaveBeenCalledWith('assignment-1')
  })

  it('explains when a selected pool no longer has a published exam', async () => {
    api.assignPlacementTest.mockRejectedValueOnce(Object.assign(new Error('No placement test'), { code: 'NO_PLACEMENT_TEST', status: 404 }))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Finish survey' }))
    fireEvent.click(await screen.findByRole('button', { name: /3–5.*2 đề/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu làm bài' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Kho này hiện chưa có đề được xuất bản. Hãy chọn kho khác.')
  })

  it('releases an open assignment from another pool before assigning the selected pool', async () => {
    api.getCurrentPlacementAttempt.mockResolvedValue({ ...attempt, status: 'CANCELLED' })
    api.getPlacementOptions.mockResolvedValue({
      ...options,
      hasPlacement: true,
      openAssignment: { assignmentId: 'old-assignment', pool: 'BAND_0_3', packageId: 'old-package', packageVersionId: 'old-version', retakesLeft: 1, nextRetakeAt: null },
    })
    api.assignPlacementTest.mockResolvedValue({ assignmentId: 'new-assignment', pool: 'BAND_3_5', packageId: 'new-package', packageVersionId: 'new-version', retakesLeft: 0, nextRetakeAt: null })
    show()
    await waitFor(() => expect(document.querySelector('.pl-pools')).toBeInTheDocument())
    fireEvent.click(document.querySelectorAll<HTMLButtonElement>('.pl-pool-card')[1])
    fireEvent.click(document.querySelector<HTMLButtonElement>('.pl-pools__start')!)
    await waitFor(() => expect(api.createAttempt).toHaveBeenCalledWith(expect.objectContaining({ packageVersionId: 'new-version' })))
    expect(api.releasePlacementAssignment).toHaveBeenCalledWith('old-assignment')
    expect(api.assignPlacementTest).toHaveBeenCalledWith('BAND_3_5')
    expect(api.releasePlacementAssignment.mock.invocationCallOrder[0]).toBeLessThan(api.assignPlacementTest.mock.invocationCallOrder[0])
  })

  it('reuses a matching open assignment without assigning, even with no retakes left', async () => {
    api.getCurrentPlacementAttempt.mockResolvedValue({ ...attempt, status: 'CANCELLED' })
    api.getPlacementOptions.mockResolvedValue({
      ...options,
      retakesLeft: 0,
      hasPlacement: true,
      openAssignment: { assignmentId: 'open-assignment', pool: 'BAND_3_5', packageId: 'open-package', packageVersionId: 'open-version', retakesLeft: 0, nextRetakeAt: null },
    })
    show()
    await waitFor(() => expect(document.querySelector('.pl-pools')).toBeInTheDocument())
    fireEvent.click(document.querySelectorAll<HTMLButtonElement>('.pl-pool-card')[1])
    fireEvent.click(document.querySelector<HTMLButtonElement>('.pl-pools__start')!)
    await waitFor(() => expect(api.createAttempt).toHaveBeenCalledWith(expect.objectContaining({ packageVersionId: 'open-version' })))
    expect(api.assignPlacementTest).not.toHaveBeenCalled()
    expect(api.releasePlacementAssignment).not.toHaveBeenCalled()
  })

  it('skips the survey when placement exists without a current attempt', async () => {
    api.getCurrentPlacementAttempt.mockResolvedValue(null)
    api.getPlacementOptions.mockResolvedValue({ ...options, hasPlacement: true })
    show()
    await waitFor(() => expect(document.querySelector('.pl-pools')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Finish survey' })).not.toBeInTheDocument()
  })

  it('skips the survey for a returning learner whose last attempt was cancelled', async () => {
    api.getCurrentPlacementAttempt.mockResolvedValue({ ...attempt, status: 'CANCELLED' })
    api.getPlacementOptions.mockResolvedValue({ ...options, hasPlacement: true })
    show()
    expect(await screen.findByRole('heading', { name: 'Chọn kho đề đầu vào' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Finish survey' })).not.toBeInTheDocument()
  })
})
