import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CommunityFeedTabs } from './CommunityFeedTabs'

describe('CommunityFeedTabs', () => {
  it('marks all as active by default', () => {
    render(<MemoryRouter><CommunityFeedTabs activeScope="ALL" /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Tất cả' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Đang theo dõi' })).not.toHaveAttribute('aria-current')
  })

  it('marks the following feed as active', () => {
    render(<MemoryRouter><CommunityFeedTabs activeScope="FOLLOWING" /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Đang theo dõi' })).toHaveAttribute('aria-current', 'page')
  })
})
