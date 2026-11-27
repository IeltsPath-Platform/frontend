import { fireEvent, render, screen, waitFor } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }))
vi.mock('@/features/practice/ai-grading-report/aiGradingReportApi', () => ({ aiGradingReportApi: { list: listMock } }))

import { AiGradingReportsPage } from './AiGradingReportsPage'

const report = {
  id: 'r-1',
  userId: 'u-1',
  submissionId: '5b0f6c1e-2222-4a2b-9c3d-000000000001',
  submissionType: 'SPEAKING' as const,
  reason: 'Phát âm bị chấm sai',
  status: 'OPEN' as const,
  createdAt: '2020-01-01T00:00:00Z',
}

describe('AiGradingReportsPage', () => {
  beforeEach(() => { listMock.mockReset() })

  it('lists open reports by default and flags ones past the review target', async () => {
    listMock.mockResolvedValue({ content: [report], page: 0, size: 20, totalElements: 1, totalPages: 1 })
    render(<AiGradingReportsPage />)

    expect(await screen.findByText('Phát âm bị chấm sai')).toBeInTheDocument()
    expect(screen.getByText('Quá 24 giờ')).toBeInTheDocument()
    expect(listMock).toHaveBeenCalledWith({ status: 'OPEN', submissionType: undefined, page: 0, size: 20 })
  })

  it('reloads from the first page when a filter changes', async () => {
    listMock.mockResolvedValue({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
    render(<AiGradingReportsPage />)
    await screen.findByText('Không có báo cáo nào')

    fireEvent.change(screen.getByLabelText('Kỹ năng'), { target: { value: 'WRITING' } })

    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith({ status: 'OPEN', submissionType: 'WRITING', page: 0, size: 20 }))
  })
})
