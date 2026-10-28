import { act, render, screen, within } from '@/test/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { elapsedText } from '../lib/elapsedText'
import { CourseDraftProgress } from './CourseDraftProgress'

const started = '2026-10-27T10:00:00Z'

describe('CourseDraftProgress', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-27T10:00:42Z')) })
  afterEach(() => vi.useRealTimers())

  it('formats the running time as minutes and seconds', () => {
    expect(elapsedText(0)).toBe('0:00')
    expect(elapsedText(59.9)).toBe('0:59')
    expect(elapsedText(125)).toBe('2:05')
    expect(elapsedText(-3)).toBe('0:00')
  })

  it('shows a queued draft waiting for its turn, with the later steps still ahead', () => {
    render(<CourseDraftProgress createdAt={started} status="QUEUED" />)
    expect(screen.getByRole('status')).toHaveTextContent('Yêu cầu đang chờ tới lượt')
    expect(screen.getByLabelText('Thời gian đã chạy')).toHaveTextContent('0:42')
    const steps = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(steps).toHaveLength(4)
    expect(steps[1]).toHaveAttribute('aria-current', 'step')
    expect(steps[1]).toHaveTextContent('Xếp hàng chờ AI')
    expect(steps[2]).not.toHaveAttribute('aria-current')
  })

  it('moves to the planning step once the draft is generating, and keeps the last step for the check', () => {
    render(<CourseDraftProgress createdAt={started} status="GENERATING" />)
    expect(screen.getByRole('status')).toHaveTextContent('AI đang lập kế hoạch khóa học')
    const steps = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(steps[2]).toHaveAttribute('aria-current', 'step')
    expect(steps[1]).toHaveClass('is-done')
    expect(steps[3]).toHaveClass('is-todo')
  })

  it('shows the request that was sent, only the parts it has', () => {
    const request = { bandLevel: 6.5, skills: ['READING' as const], topics: [], knowledgePointIds: ['a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222'], lessonCount: 8 }
    render(<CourseDraftProgress createdAt={started} request={request} status="QUEUED" />)

    const facts = screen.getByRole('region', { name: 'Yêu cầu đã gửi' })
    expect(within(facts).getByText('Band').nextSibling).toHaveTextContent('6.5')
    expect(within(facts).getByText('Kỹ năng').nextSibling).toHaveTextContent('Đọc')
    expect(within(facts).getByText('Số bài học').nextSibling).toHaveTextContent('8')
    expect(within(facts).getByText('Điểm kiến thức').nextSibling).toHaveTextContent('2')
    expect(within(facts).queryByText('Chủ đề')).not.toBeInTheDocument()
  })

  it('has no request section for a draft that carries no request', () => {
    render(<CourseDraftProgress createdAt={started} request={{}} status="QUEUED" />)
    expect(screen.queryByRole('region', { name: 'Yêu cầu đã gửi' })).not.toBeInTheDocument()
  })

  it('keeps the clock running and warns only when the wait is longer than usual', () => {
    render(<CourseDraftProgress createdAt={started} status="GENERATING" />)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(80_000) })
    expect(screen.getByLabelText('Thời gian đã chạy')).toHaveTextContent('2:02')
    expect(screen.getByRole('note')).toHaveTextContent('lâu hơn thường lệ')
  })
})
