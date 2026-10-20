import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DictationVideoListItem } from '../api/videoDictationApi'
import { VideoDictationLibraryPage } from './VideoDictationLibraryPage'

const { apiMock } = vi.hoisted(() => ({ apiMock: { list: vi.fn() } }))

vi.mock('../api/videoDictationApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/videoDictationApi')>()),
  videoDictationApi: apiMock,
}))
vi.mock('@/components/SiteNavbar', () => ({ SiteNavbar: () => <nav aria-label="site" /> }))

const video = (over: Partial<DictationVideoListItem>): DictationVideoListItem => ({
  id: 'v1', youtubeVideoId: 'y1', title: 'Daily Routines', thumbnailUrl: null, durationSeconds: 192, level: 'A2',
  totalSegments: 24, passedSegments: 0, lastPracticedAt: null, ...over,
})

const renderPage = () => render(<MemoryRouter><VideoDictationLibraryPage /></MemoryRouter>)

describe('VideoDictationLibraryPage', () => {
  beforeEach(() => apiMock.list.mockReset())

  it('shows a loading state, then the videos grouped by level with progress', async () => {
    apiMock.list.mockResolvedValue([
      video({ id: 'a2', title: 'Daily Routines', passedSegments: 7 }),
      video({ id: 'b1', title: 'Science Museum', level: 'B1', totalSegments: 30 }),
    ])
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải')

    expect(await screen.findByRole('heading', { name: /A2.*Cơ bản/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /B1.*Trung cấp/ })).toBeInTheDocument()
    expect(screen.getByText('7/24')).toBeInTheDocument()
    expect(screen.getByText('Chưa làm')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Science Museum, 30 câu/ })).toHaveAttribute('href', '/video-dictation/b1')
  })

  it('offers to continue a started video', async () => {
    apiMock.list.mockResolvedValue([video({ id: 'a2', passedSegments: 7 })])
    renderPage()

    expect(await screen.findByText('Tiếp tục xem')).toBeInTheDocument()
    expect(screen.getByText(/Câu 8 \/ 24/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tiếp tục/ })).toHaveAttribute('href', '/video-dictation/a2')
  })

  it('filters by level and search text, and can clear the filters', async () => {
    apiMock.list.mockResolvedValue([
      video({ id: 'a2', title: 'Daily Routines' }),
      video({ id: 'c1', title: 'Leadership Talk', level: 'C1' }),
    ])
    renderPage()
    await screen.findByText('Daily Routines')

    fireEvent.click(screen.getByRole('button', { name: /^C1/ }))
    expect(screen.queryByText('Daily Routines')).not.toBeInTheDocument()
    expect(screen.getByText('Leadership Talk')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tìm tên video'), { target: { value: 'zzz' } })
    expect(screen.getByText(/Không có video nào khớp/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
    expect(screen.getByText('Daily Routines')).toBeInTheDocument()
  })

  it('shows each level as one swipeable row, with a card that opens the whole level, and pages through the grid', async () => {
    const many = Array.from({ length: 60 }, (_, i) => video({ id: `v${i}`, title: `Video ${String(i).padStart(2, '0')}`, level: 'B1' }))
    apiMock.list.mockResolvedValue([...many, video({ id: 'a2', title: 'Daily Routines' })])
    renderPage()
    await screen.findByRole('heading', { name: /B1.*Trung cấp/ })

    const links = () => screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/video-dictation/v'))
    expect(screen.getByRole('list', { name: /Video B1/ })).toBeInTheDocument()
    expect(links()).toHaveLength(20) // a row is the first 20, not all 60
    expect(screen.getByText('Daily Routines')).toBeInTheDocument() // a level with one video is a row of one
    expect(screen.getByRole('button', { name: 'Xem tất cả 60 video B1' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Xem tất cả 60 video B1' }))
    expect(screen.queryByRole('list', { name: /Video B1/ })).not.toBeInTheDocument() // now a grid of the one level
    expect(links()).toHaveLength(24)
    expect(screen.queryByText('Daily Routines')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Xem thêm 24 video.*còn 36/ }))
    expect(links()).toHaveLength(48)
    fireEvent.click(screen.getByRole('button', { name: /Xem thêm 12 video.*còn 12/ }))
    expect(links()).toHaveLength(60)

    fireEvent.click(screen.getByRole('button', { name: /^Tất cả/ })) // back to all levels: rows again
    expect(links()).toHaveLength(20)
  })
  it('shows an empty state when there is no video', async () => {
    apiMock.list.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText(/Chưa có video nghe chép nào/)).toBeInTheDocument()
  })

  it('shows the error and retries', async () => {
    apiMock.list.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([video({})])
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được thư viện video')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(screen.getByText('Daily Routines')).toBeInTheDocument())
    expect(apiMock.list).toHaveBeenCalledTimes(2)
  })
})
