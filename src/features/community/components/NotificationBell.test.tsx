import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationBell, TOAST_MS } from './NotificationBell'

const state = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('../hooks/useCommunityNotifications', () => ({ useCommunityNotifications: () => state.current }))

const examinerNotice = { id: '60000000-0000-4000-8000-000000000001', eventType: 'assessment.grading-requested.v1', actorId: '60000000-0000-4000-8000-000000000002', gradingJobId: '60000000-0000-4000-8000-000000000003' }

describe('NotificationBell pop-up', () => {
  const dismissFresh = vi.fn()
  const markRead = vi.fn().mockResolvedValue(undefined)

  function show(fresh: unknown) {
    state.current = { items: [], unread: 1, error: '', announcement: 'Bạn có thông báo mới.', fresh, dismissFresh, markRead, markAll: vi.fn() }
    return render(<MemoryRouter><NotificationBell enabled /></MemoryRouter>)
  }

  beforeEach(() => { vi.useFakeTimers(); dismissFresh.mockClear(); markRead.mockClear() })
  afterEach(() => { vi.useRealTimers() })

  it('tells the examiner at once, under the bell, that a learner chose them, and leads to the queue', () => {
    show(examinerNotice)

    const toast = screen.getByTestId('notification-toast')
    expect(toast).toHaveTextContent('Có bài mới chờ bạn chấm')
    expect(screen.getByRole('link', { name: /Có bài mới chờ bạn chấm/ })).toHaveAttribute('href', '/admin/grading/writing')
  })

  it('shows nothing when no notification just arrived', () => {
    show(null)
    expect(screen.queryByTestId('notification-toast')).not.toBeInTheDocument()
  })

  it('goes away by itself after a few seconds, and when it is closed', () => {
    show(examinerNotice)

    act(() => { vi.advanceTimersByTime(TOAST_MS) })
    expect(dismissFresh).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo mới' }))
    expect(dismissFresh).toHaveBeenCalledTimes(2)
  })

  it('marks the notification read when it is opened', () => {
    show(examinerNotice)

    fireEvent.click(screen.getByRole('link', { name: /Có bài mới chờ bạn chấm/ }))

    expect(markRead).toHaveBeenCalledWith(examinerNotice.id)
    expect(dismissFresh).toHaveBeenCalled()
  })

  it('hides the pop-up once the list is opened, since the list shows the same notice', () => {
    show(examinerNotice)

    fireEvent.click(screen.getByRole('button', { name: /Thông báo, 1 chưa đọc/ }))

    expect(screen.queryByTestId('notification-toast')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Thông báo' })).toBeInTheDocument()
  })

  it('shows nothing at all for someone who does not get notifications', () => {
    state.current = { items: [], unread: 0, error: '', announcement: '', fresh: null, dismissFresh, markRead, markAll: vi.fn() }
    const { container } = render(<MemoryRouter><NotificationBell enabled={false} /></MemoryRouter>)
    expect(container).toBeEmptyDOMElement()
  })
})
