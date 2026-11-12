import { render, screen, within } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpeakingWaitingPanel } from './SpeakingWaitingPanel'

const current = () => within(screen.getByRole('list', { name: 'Các bước chấm bài' })).getAllByRole('listitem')
  .filter((item) => item.getAttribute('aria-current') === 'step')

describe('SpeakingWaitingPanel', () => {
  afterEach(() => { vi.useRealTimers() })

  it.each([
    ['QUEUED', 'Đã nhận bài', 'Đang chờ tới lượt chấm'],
    ['ANALYZING', 'Phân tích giọng nói', 'Đang phân tích giọng nói'],
    ['GRADING', 'Chấm bài', 'Đang chấm bài'],
    ['PAYMENT_PENDING', 'Hoàn tất kết quả', 'Đang hoàn tất kết quả'],
  ])('shows %s as the stage "%s"', (status, stage, title) => {
    render(<SpeakingWaitingPanel status={status} />)

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(current()).toHaveLength(1)
    expect(current()[0]).toHaveTextContent(stage)
  })

  it('marks the earlier stages done and the later ones still to come', () => {
    render(<SpeakingWaitingPanel status="GRADING" />)
    const items = within(screen.getByRole('list', { name: 'Các bước chấm bài' })).getAllByRole('listitem')

    expect(items.map((item) => item.className)).toEqual([
      expect.stringContaining('sw__step--done'), expect.stringContaining('sw__step--done'),
      expect.stringContaining('sw__step--now'), expect.stringContaining('sw__step--todo'),
    ])
  })

  it('keeps the stage of a retry and says the learner is not charged', () => {
    render(<SpeakingWaitingPanel status="FAILED_RETRYABLE" />)

    expect(screen.getByRole('heading', { name: 'Đang thử chấm lại' })).toBeInTheDocument()
    expect(screen.getByText(/không bị trừ point/)).toBeInTheDocument()
    expect(current()[0]).toHaveTextContent('Chấm bài')
  })

  it('counts the time waited', () => {
    vi.useFakeTimers()
    render(<SpeakingWaitingPanel status="ANALYZING" />)
    expect(screen.getByText('Đã chờ 0:00')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(65_000) })

    expect(screen.getByText('Đã chờ 1:05')).toBeInTheDocument()
  })

  it('promises no fixed time and changes its note as the wait gets longer', () => {
    vi.useFakeTimers()
    render(<SpeakingWaitingPanel status="GRADING" />)
    expect(screen.getByText(/Thời gian chấm tùy độ dài bài nói/)).toBeInTheDocument()
    expect(screen.queryByText(/giây · giữ trang/)).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(35_000) })
    expect(screen.getByText(/cần thêm thời gian/)).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(90_000) })
    expect(screen.getByText(/có thể mất vài phút/)).toBeInTheDocument()
    expect(screen.getByText(/không cần gửi lại/)).toBeInTheDocument()
  })

  it('shows a plain loading message before the status is known', () => {
    render(<SpeakingWaitingPanel status={undefined} />)

    expect(screen.getByRole('heading', { name: 'Đang tải kết quả' })).toBeInTheDocument()
    expect(screen.getByText('Chờ một chút nhé.')).toBeInTheDocument()
  })
})
