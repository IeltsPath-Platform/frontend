import { act, render, screen, within } from '@testing-library/react'
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

  it('keeps the clock running and warns only when the wait is longer than usual', () => {
    render(<CourseDraftProgress createdAt={started} status="GENERATING" />)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(80_000) })
    expect(screen.getByLabelText('Thời gian đã chạy')).toHaveTextContent('2:02')
    expect(screen.getByRole('note')).toHaveTextContent('lâu hơn thường lệ')
  })
})
