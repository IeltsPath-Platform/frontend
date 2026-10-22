import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as useDeckStudyCardsModule from '../hooks/useDeckStudyCards'
import { LearnPage } from './LearnPage'

const MOCK_CARDS = [
  { id: '1', front: 'pollution', back: 'sự ô nhiễm' },
  { id: '2', front: 'conservation', back: 'sự bảo tồn' },
  { id: '3', front: 'environment', back: 'môi trường' },
]

describe('LearnPage', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('shows owl feedback in aria-live region when learner answers wrong', async () => {
    vi.spyOn(useDeckStudyCardsModule, 'useDeckStudyCards').mockReturnValue({
      deck: { id: 'd1', name: 'Môi trường', description: null, status: 'ACTIVE', createdAt: '2026-10-21T00:00:00Z', updatedAt: '2026-10-21T00:00:00Z', cardCount: 3, dueCount: 0 },
      cards: MOCK_CARDS,
      error: '',
    })

    render(
      <MemoryRouter initialEntries={['/flashcards/decks/d1/learn']}>
        <Routes>
          <Route path="/flashcards/decks/:deckId/learn" element={<LearnPage />} />
        </Routes>
      </MemoryRouter>
    )

    const prompt = screen.getByRole('heading', { level: 2 }).textContent
    const currentCard = MOCK_CARDS.find((c) => c.front === prompt)!
    const wrongCard = MOCK_CARDS.find((c) => c.id !== currentCard.id)!

    const wrongBtn = screen.getByRole('button', { name: new RegExp(wrongCard.back) })
    await userEvent.click(wrongBtn)

    const coachRegion = screen.getByRole('status')
    expect(coachRegion).toHaveAttribute('aria-live', 'polite')
    expect(coachRegion.textContent?.length).toBeGreaterThan(0)
    expect(screen.getByText(/Chưa đúng/)).toBeInTheDocument()
  })

  it('still displays owl coach text under reduced motion', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    vi.spyOn(useDeckStudyCardsModule, 'useDeckStudyCards').mockReturnValue({
      deck: { id: 'd1', name: 'Môi trường', description: null, status: 'ACTIVE', createdAt: '2026-10-21T00:00:00Z', updatedAt: '2026-10-21T00:00:00Z', cardCount: 3, dueCount: 0 },
      cards: MOCK_CARDS,
      error: '',
    })

    render(
      <MemoryRouter initialEntries={['/flashcards/decks/d1/learn']}>
        <Routes>
          <Route path="/flashcards/decks/:deckId/learn" element={<LearnPage />} />
        </Routes>
      </MemoryRouter>
    )

    const prompt = screen.getByRole('heading', { level: 2 }).textContent
    const currentCard = MOCK_CARDS.find((c) => c.front === prompt)!
    const wrongCard = MOCK_CARDS.find((c) => c.id !== currentCard.id)!

    const wrongBtn = screen.getByRole('button', { name: new RegExp(wrongCard.back) })
    await userEvent.click(wrongBtn)

    const coachRegion = screen.getByRole('status')
    expect(coachRegion).toBeInTheDocument()
    expect(coachRegion.textContent?.length).toBeGreaterThan(0)
  })
})
