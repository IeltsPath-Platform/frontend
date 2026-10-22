import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { flashcardApi, type DeckItem } from '../api/flashcardApi'
import { DeckBrowser } from './DeckBrowser'

const item = (id: string, front: string, leitnerBox?: number): DeckItem => ({
  deckId: 'deck', flashcardId: id, sortOrder: null, addedAt: '2026-10-21T00:00:00Z', front, back: `nghĩa ${front}`,
  sourceType: 'MANUAL', status: 'ACTIVE', leitnerBox,
})

describe('DeckBrowser', () => {
  it('filters by mastery and toggles the current card between learned and forgotten', async () => {
    const review = vi.spyOn(flashcardApi, 'review').mockResolvedValue({} as never)
    render(<DeckBrowser items={[item('a', 'pollution'), item('b', 'renewable', 5)]} onEdit={vi.fn()} onRemove={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Chưa thuộc (1)' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Đã thuộc (1)' }))
    expect(screen.getByRole('button', { name: /Mặt trước: renewable/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Tất cả (2)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã thuộc' }))
    expect(review).toHaveBeenCalledWith('a', true, expect.any(String))
    expect(screen.getByRole('button', { name: 'Đã thuộc (2)' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Quên rồi/ }))
    expect(review).toHaveBeenLastCalledWith('a', false, expect.any(String))
    expect(screen.getByRole('button', { name: 'Đã thuộc (1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đánh dấu đã thuộc' })).toBeEnabled()
  })
})
