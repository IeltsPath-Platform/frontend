import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { HeroCourse } from '../overviewViewModel'
import { OverviewHeroBanner } from './OverviewHeroBanner'

describe('overview hero provenance and missing progress', () => {
  it.each(['Ước tính từ quá trình học', 'Tự khai trong hồ sơ'])('shows %s beside the current journey band', (sourceLabel) => {
    render(<OverviewHeroBanner username="Học viên" band={{ current: 6, currentIsEstimate: sourceLabel.startsWith('Ước'), target: 7, examDate: null }} bandSourceLabel={sourceLabel} journeyStart={5} courses={[]} />)

    expect(screen.getByText(sourceLabel)).toBeVisible()
    expect(screen.getByRole('region', { name: 'Hành trình IELTS' })).toHaveTextContent(sourceLabel)
  })

  it('does not present unavailable course progress as zero percent while loading', () => {
    render(<OverviewHeroBanner username="Học viên" band={{ current: null, currentIsEstimate: false, target: null, examDate: null }} journeyStart={null} courses={[]} courseLoading />)

    expect(screen.getByRole('img', { name: 'Chưa có dữ liệu tiến độ' })).toBeVisible()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Đang tải khóa học…' })).toBeVisible()
  })
})

describe('overview course selector', () => {
  const first: HeroCourse = { id: 'recent', name: 'IELTS 7.0', bandLevel: 7, percent: 14, completedLessons: 2, totalLessons: 14, startedAt: '2026-11-06T08:00:00Z' }
  const second: HeroCourse = { id: 'speaking', name: 'Speaking Masterclass', bandLevel: null, percent: 50, completedLessons: 8, totalLessons: 16, startedAt: '2026-10-01T08:00:00Z' }
  const props = { username: 'Học viên', band: { current: 6, currentIsEstimate: false, target: 7, examDate: null }, journeyStart: 5 }
  const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
  beforeAll(() => Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }))
  afterAll(() => {
    if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  })

  it('changes all course facts and continue target together, keeping the IELTS journey global', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<OverviewHeroBanner {...props} courses={[first, second]} onContinueStudy={onContinue} />)
    expect(screen.getByText('Đang học 2 khóa')).toBeVisible()
    const trigger = screen.getByRole('combobox', { name: 'Chọn khóa học' })
    expect(trigger).toHaveTextContent('IELTS 7.0')
    const journey = screen.getByRole('region', { name: 'Hành trình IELTS' }).textContent
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('option', { name: /Speaking Masterclass/ })).toHaveTextContent('8/16 bài')
    expect(screen.getByRole('option', { name: /Speaking Masterclass/ })).toHaveTextContent('50%')
    await user.keyboard('{End}{Enter}')
    expect(trigger).toHaveTextContent('Speaking Masterclass')
    expect(screen.getByText('Bắt đầu: 1/10/2026')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Hoàn thành 50%' })).toBeVisible()
    expect(screen.getByText('Còn 8 bài học')).toBeVisible()
    expect(screen.getByRole('region', { name: 'Hành trình IELTS' }).textContent).toBe(journey)
    await user.click(screen.getByRole('button', { name: 'Tiếp tục học' }))
    expect(onContinue).toHaveBeenCalledWith(second)
  })

  it('shows no selector for one course and does not invent a missing percentage', () => {
    render(<OverviewHeroBanner {...props} courses={[{ ...first, percent: null }]} />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'IELTS 7.0' })).toBeVisible()
    expect(screen.getByRole('img', { name: 'Chưa có dữ liệu tiến độ' })).toBeVisible()
  })

  it('keeps a valid manual choice on refresh and falls back if that course disappears', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<OverviewHeroBanner {...props} courses={[first, second]} />)
    screen.getByRole('combobox').focus()
    await user.keyboard('{Enter}{End}{Enter}')
    rerender(<OverviewHeroBanner {...props} courses={[{ ...first, completedLessons: 3 }, second]} />)
    expect(screen.getByRole('combobox')).toHaveTextContent(second.name)
    rerender(<OverviewHeroBanner {...props} courses={[first]} />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Tiến độ khóa học' })).getByText('Còn 12 bài học')).toBeVisible()
  })
})
