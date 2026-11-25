import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listSecurityEventsMock = vi.hoisted(() => vi.fn())
vi.mock('../api/profileApi', () => ({
  profileApi: { listSecurityEvents: listSecurityEventsMock },
}))

import { SecurityActivitySection } from './SecurityActivitySection'

describe('SecurityActivitySection', () => {
  beforeEach(() => {
    listSecurityEventsMock.mockReset()
  })

  it('shows each event with its Vietnamese name, address and device', async () => {
    listSecurityEventsMock.mockResolvedValue([
      { id: 'e1', eventType: 'PASSWORD_CHANGED', ipAddress: '203.0.113.x', userAgent: 'Chrome on Windows', createdAt: null },
      { id: 'e2', eventType: 'GOOGLE_UNLINKED', ipAddress: null, userAgent: null, createdAt: null },
    ])

    render(<SecurityActivitySection />)

    expect(await screen.findByText('Đổi mật khẩu')).toBeInTheDocument()
    expect(screen.getByText('203.0.113.x · Chrome on Windows')).toBeInTheDocument()
    expect(screen.getByText('Hủy liên kết Google')).toBeInTheDocument()
  })

  it('shows an event type it does not know as sent', async () => {
    listSecurityEventsMock.mockResolvedValue([
      { id: 'e1', eventType: 'SOMETHING_NEW', ipAddress: null, userAgent: null, createdAt: null },
    ])

    render(<SecurityActivitySection />)

    expect(await screen.findByText('SOMETHING_NEW')).toBeInTheDocument()
  })

  it('says so when there is no activity yet', async () => {
    listSecurityEventsMock.mockResolvedValue([])

    render(<SecurityActivitySection />)

    expect(await screen.findByText('Chưa có hoạt động nào.')).toBeInTheDocument()
  })

  it('shows a message when the history cannot be loaded', async () => {
    listSecurityEventsMock.mockRejectedValue(new Error('network'))

    render(<SecurityActivitySection />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được hoạt động bảo mật')
  })
})
