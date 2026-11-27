import { fireEvent, render, screen, waitFor } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'

const { submitMock } = vi.hoisted(() => ({ submitMock: vi.fn() }))
vi.mock('./aiGradingReportApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./aiGradingReportApi')>()),
  aiGradingReportApi: { submit: submitMock },
}))

import { ReportAiGradingButton } from './ReportAiGradingButton'

const SUBMISSION = '5b0f6c1e-2222-4a2b-9c3d-000000000001'

function openDialog() {
  render(<ReportAiGradingButton submissionId={SUBMISSION} submissionType="WRITING" />)
  fireEvent.click(screen.getByRole('button', { name: 'Báo cáo kết quả chấm sai' }))
}

describe('ReportAiGradingButton', () => {
  beforeEach(() => { submitMock.mockReset() })

  it('refuses an empty reason without calling the server', async () => {
    openDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(submitMock).not.toHaveBeenCalled()
  })

  it('sends the trimmed reason and marks the grade as reported', async () => {
    submitMock.mockResolvedValue({})
    openDialog()
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: '  Band CC quá thấp  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }))

    await waitFor(() => expect(submitMock).toHaveBeenCalledWith({ submissionId: SUBMISSION, submissionType: 'WRITING', reason: 'Band CC quá thấp' }))
    expect(await screen.findByRole('button', { name: 'Đã báo cáo kết quả chấm' })).toBeDisabled()
  })

  it('shows the server message and keeps the dialog open when sending fails', async () => {
    submitMock.mockRejectedValue(new HttpError(403, 'Bài nộp không thuộc về bạn.'))
    openDialog()
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: 'Sai điểm' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }))

    expect(await screen.findByText('Bài nộp không thuộc về bạn.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
