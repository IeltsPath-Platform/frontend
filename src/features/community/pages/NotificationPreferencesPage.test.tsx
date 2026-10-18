import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationPreferencesPage } from './NotificationPreferencesPage'

const { api } = vi.hoisted(() => ({ api: { notificationPreferences: vi.fn(), updateNotificationPreference: vi.fn() } }))
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
    expect(screen.getAllByRole('switch')).toHaveLength(5)
    const comments = screen.getByRole('switch', { name: 'Bình luận bài viết' })
    expect(comments).toBeChecked()
    fireEvent.click(comments)
    await waitFor(() => expect(api.updateNotificationPreference).toHaveBeenCalledWith('community.post-commented.v1', false))
    expect(comments).not.toBeChecked()
  })
})
