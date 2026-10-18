import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContentReportsAdminPage } from './ContentReportsAdminPage'

const { api, auth } = vi.hoisted(() => ({ api: { pendingReports: vi.fn(), resolveReport: vi.fn() }, auth: vi.fn() }))
vi.mock('../api/communityApi', () => ({ communityApi: api }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: auth }))
const report = { id: 'report-1', reporterId: 'user-2-uuid-long', reporterDisplayName: 'Người báo cáo', contentType: 'POST' as const, contentId: 'post-1', contentAuthorId: 'user-3-uuid-long', contentAuthorDisplayName: 'Tác giả', contentPreview: 'Nội dung cần xem xét', reason: 'Spam', status: 'PENDING' as const, createdAt: '2026-10-17T08:00:00Z' }

function renderAt(url: string) {
  return render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/community/admin/reports" element={<ContentReportsAdminPage />} /></Routes></MemoryRouter>)
}

describe('ContentReportsAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.mockReturnValue({ roles: ['ADMIN'] })
    api.pendingReports.mockResolvedValue({ content: [report] })
    api.resolveReport.mockResolvedValue({ ...report, status: 'ACTIONED' })
    vi.stubGlobal('ResizeObserver', class { observe() {}; disconnect() {}; unobserve() {} })
  })

  it('renders the admin queue from its page URL and resolves a report', async () => {
    renderAt('/community/admin/reports')
    expect(await screen.findByText('Nội dung cần xem xét')).toBeInTheDocument()
    expect(screen.getByText('Người báo cáo: Người báo cáo')).toBeInTheDocument()
    expect(screen.getByText((_text, element) => element?.tagName === 'SMALL' && element.textContent === ' · Tác giả: Tác giả')).toBeInTheDocument()
    expect(screen.queryByText(/user-2-uuid-long/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ẩn nội dung' }))
    await waitFor(() => expect(api.resolveReport).toHaveBeenCalledWith('report-1', 'HIDE_CONTENT'))
    await waitFor(() => expect(screen.getByText('Không có báo cáo đang chờ.')).toBeInTheDocument())
    expect(api.pendingReports).toHaveBeenCalled()
  })

  it('shortens reporter and author IDs when public display names are unavailable', async () => {
    api.pendingReports.mockResolvedValue({ content: [{ ...report, reporterDisplayName: null, contentAuthorDisplayName: null }] })
    renderAt('/community/admin/reports')
    expect(await screen.findByText('Người báo cáo: user-2-u…')).toBeInTheDocument()
    expect(screen.getByText((_text, element) => element?.tagName === 'SMALL' && element.textContent === ' · Tác giả: user-3-u…')).toBeInTheDocument()
  })

  it('does not request or reveal the queue to non-admin users', async () => {
    auth.mockReturnValue({ roles: ['CUSTOMER'] })
    renderAt('/community/admin/reports')
    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền xem hàng chờ này.')
    expect(api.pendingReports).not.toHaveBeenCalled()
  })
})
