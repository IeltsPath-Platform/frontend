import { render, screen } from '@/test/render'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlacementRetakeEntry } from './PlacementRetakeEntry'

const api = vi.hoisted(() => ({ getPlacementOptions: vi.fn() }))
vi.mock('../api', () => ({ learningApi: api }))

describe('PlacementRetakeEntry', () => {
  beforeEach(() => vi.clearAllMocks())

  it('links to the picker and shows retakes remaining', async () => {
    api.getPlacementOptions.mockResolvedValue({ pools: [], limitPer24h: 3, retakesLeft: 2, nextRetakeAt: null, hasPlacement: true, currentBand: 5, openAssignment: null })
    render(<MemoryRouter><PlacementRetakeEntry /></MemoryRouter>)
    expect(await screen.findByRole('link', { name: /Làm lại bài test đầu vào.*còn 2 lượt/i })).toHaveAttribute('href', '/learn/placement')
  })

  it('shows the limit and the next opening time', async () => {
    api.getPlacementOptions.mockResolvedValue({ pools: [], limitPer24h: 3, retakesLeft: 0, nextRetakeAt: '2026-11-19T00:30:00Z', hasPlacement: true, currentBand: 5, openAssignment: null })
    render(<MemoryRouter><PlacementRetakeEntry /></MemoryRouter>)
    expect(await screen.findByText(/hết lượt trong 24 giờ/i)).toBeInTheDocument()
    expect(screen.getByText(/Mở lượt tiếp theo:/i)).toBeInTheDocument()
  })
})
