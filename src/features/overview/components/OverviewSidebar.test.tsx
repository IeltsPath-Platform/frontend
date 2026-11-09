import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OverviewSidebar } from './OverviewSidebar'

describe('OverviewSidebar', () => {
  it('lists the achievements right below the detailed data and marks the open tab', () => {
    render(<OverviewSidebar activeTab="achievements" onSelectTab={vi.fn()} />)
    const items = screen.getAllByRole('button').map((button) => button.textContent)
    expect(items).toEqual(['Tổng quát', 'Dữ liệu chi tiết', 'Thành tích của tôi', 'Hồ sơ của tôi'])
    expect(screen.getByRole('button', { name: 'Thành tích của tôi' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Dữ liệu chi tiết' })).not.toHaveAttribute('aria-current')
  })

  it('selects the achievements tab', async () => {
    const onSelectTab = vi.fn()
    render(<OverviewSidebar activeTab="overview" onSelectTab={onSelectTab} />)
    await userEvent.click(screen.getByRole('button', { name: 'Thành tích của tôi' }))
    expect(onSelectTab).toHaveBeenCalledWith('achievements')
  })
})
