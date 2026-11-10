import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationPreferencesPage } from './NotificationPreferencesPage'

const { api } = vi.hoisted(() => ({ api: {
  notificationPreferences: vi.fn(),
  updateNotificationPreference: vi.fn(),
  mailPreferences: vi.fn(() => Promise.resolve({ learning: true })),
  updateMailPreferences: vi.fn((learning: boolean) => Promise.resolve({ learning })),
} }))
vi.mock('../api/communityApi', () => ({ communityApi: api }))

const defaults = [
  { eventType: 'community.post-commented.v1', enabled: true },
  { eventType: 'community.comment-replied.v1', enabled: true },
  { eventType: 'community.comment-mentioned.v1', enabled: true },
  { eventType: 'community.post-reacted.v1', enabled: true },
  { eventType: 'community.user-followed.v1', enabled: true },
]

describe('NotificationPreferencesPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    api.notificationPreferences.mockResolvedValue(defaults)
    api.updateNotificationPreference.mockResolvedValue({ eventType: defaults[0].eventType, enabled: false })
  })

  it('renders preferences from the settings URL and saves an individual switch', async () => {
    render(<MemoryRouter initialEntries={['/notifications/preferences']}><Routes>
      <Route path="/notifications/preferences" element={<NotificationPreferencesPage />} />
    </Routes></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Tùy chọn thông báo' })).toBeInTheDocument()
    // Five community switches plus the learning-email switch.
    expect(screen.getAllByRole('switch')).toHaveLength(6)
    const comments = screen.getByRole('switch', { name: 'Bình luận bài viết' })
    expect(comments).toBeChecked()
    fireEvent.click(comments)
    await waitFor(() => expect(api.updateNotificationPreference).toHaveBeenCalledWith('community.post-commented.v1', false))
    expect(comments).not.toBeChecked()
    expect(screen.getByRole('heading', { name: 'Học viên' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Giám khảo' })).not.toBeInTheDocument()
  })

  it('groups examiner notification preferences separately while keeping one learning mail switch', async () => {
    api.notificationPreferences.mockResolvedValue([
      ...defaults,
      { eventType: 'assessment.grading-requested.v1', enabled: true },
      { eventType: 'assessment.grading-due-soon.v1', enabled: true },
      { eventType: 'access.subscription-granted.v1', enabled: true },
    ])
    render(<MemoryRouter initialEntries={['/notifications/preferences']}><Routes>
      <Route path="/notifications/preferences" element={<NotificationPreferencesPage />} />
    </Routes></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'Giám khảo' })).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(9)
    expect(screen.getAllByRole('switch', { name: /email học tập/i })).toHaveLength(1)
  })
})
