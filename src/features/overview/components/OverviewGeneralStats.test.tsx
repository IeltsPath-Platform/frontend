import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OverviewGeneralStats } from './OverviewGeneralStats'
import type { StudyTimeStatistics } from '../api/overviewApi'

const resource = <T,>(data: T) => ({ data, loading: false, error: null, reload: vi.fn() })

describe('weekly study streak', () => {
  it('shows the current and longest streak and navigates the available activity history', () => {
    const time: StudyTimeStatistics = {
      availability: 'AVAILABLE', generatedAt: '', dataFrom: null, timezonePolicy: '', scope: 'ALL', days: [
        { date: '2026-10-26', timezone: '', actualSeconds: 60, plannedSeconds: null, status: 'COMPLETE' },
        { date: '2026-11-02', timezone: '', actualSeconds: 0, plannedSeconds: null, status: 'COMPLETE' },
        { date: '2026-11-04', timezone: '', actualSeconds: 60, plannedSeconds: null, status: 'COMPLETE' },
      ]
    }
    render(<OverviewGeneralStats learning={resource(null)} time={resource(time)} streak={resource({ currentDays: 5, longestDays: 28, activeToday: false, freezeAvailable: true })} today={new Date(2026, 10, 8)} />)

    const week = screen.getByRole('region', { name: 'Ngày có hoạt động học tuần này' })
    expect(within(week).getByText('ngày liên tiếp có làm bài')).toHaveTextContent('5 ngày liên tiếp có làm bài')
    expect(within(week).getByText(/Kỷ lục chuỗi làm bài/).parentElement).toHaveTextContent('28 ngày')
    expect(within(week).getByText('02/11/2026 – 08/11/2026')).toBeVisible()
    expect(within(week).getByText('Có 1 lượt đóng băng bảo vệ chuỗi')).toBeVisible()
    expect(within(week).getByRole('button', { name: 'Tuần tiếp theo' })).toBeDisabled()
    fireEvent.click(within(week).getByRole('button', { name: 'Tuần trước' }))
    expect(within(week).getByText('26/10/2026 – 01/11/2026')).toBeVisible()
    expect(within(week).getByRole('button', { name: 'Tuần trước' })).toBeDisabled()
    fireEvent.click(within(week).getByRole('button', { name: 'Tuần tiếp theo' }))
    expect(within(week).getByText('02/11/2026 – 08/11/2026')).toBeVisible()
  })

  it('does not claim a freeze is available when it has already been used', () => {
    render(<OverviewGeneralStats learning={resource(null)} time={resource(null)} streak={resource({ currentDays: 0, longestDays: 1, activeToday: false, freezeAvailable: false })} today={new Date(2026, 10, 8)} />)
    expect(screen.queryByText('Có 1 lượt đóng băng bảo vệ chuỗi')).not.toBeInTheDocument()
  })

  it('marks the days a freeze covered with a snowflake and explains it', () => {
    render(<OverviewGeneralStats learning={resource(null)} time={resource(null)} streak={resource({ currentDays: 5, longestDays: 9, activeToday: false, freezeAvailable: false, frozenDays: ['2026-11-04', '2026-11-05'] })} today={new Date(2026, 10, 8)} />)
    expect(screen.getByRole('listitem', { name: /T4, .*: Chuỗi được giữ nhờ đóng băng/ })).toBeVisible()
    expect(screen.getByRole('listitem', { name: /T5, .*: Chuỗi được giữ nhờ đóng băng/ })).toBeVisible()
    expect(screen.queryByRole('listitem', { name: /T3, .*đóng băng/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Bông tuyết: ngày chuỗi được giữ nhờ đóng băng/)).toBeVisible()
  })

  it('does not mention snowflakes when no shown day was frozen', () => {
    render(<OverviewGeneralStats learning={resource(null)} time={resource(null)} streak={resource({ currentDays: 5, longestDays: 9, activeToday: false, frozenDays: ['2026-10-20'] })} today={new Date(2026, 10, 8)} />)
    expect(screen.queryByText(/Bông tuyết/)).not.toBeInTheDocument()
  })

  it('no longer shows the separate summary cards above the weekly strip', () => {
    render(<OverviewGeneralStats learning={resource(null)} time={resource(null)} streak={resource({ currentDays: 3, longestDays: 9, activeToday: true })} today={new Date(2026, 10, 8)} />)
    for (const label of ['Tổng số ngày học', 'Đề luyện đã nộp', 'Tỷ lệ chính xác', 'Streak học']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })
})
