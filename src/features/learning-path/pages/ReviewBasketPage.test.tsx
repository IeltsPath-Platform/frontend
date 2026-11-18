import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/toast/ToastProvider'
import type { BasketOptionalItem, BasketReason, ReviewBasket } from '~types/learningPath'
import { learningApi } from '../api'
import { ReviewBasketPage } from './ReviewBasketPage'

vi.mock('../api', async () => ({
  ...await import('../api/apiError'),
  learningApi: { getReviewBasket: vi.fn(), startBasketReview: vi.fn() },
}))

function item(name: string, reason: BasketReason, patch: Partial<BasketOptionalItem> = {}): BasketOptionalItem {
  return {
    knowledgePointId: `kp-${name}`, code: name.toUpperCase(), name, skill: 'READING', tier: 'PRIORITY', mastery: 0.3,
    dueAt: null, reason, hasUnrevealedSet: true, reviewId: null, ...patch,
  }
}

function renderBasket(basket: Partial<ReviewBasket>) {
  vi.mocked(learningApi.getReviewBasket).mockResolvedValue({ required: [], consolidate: [], due: [], weak: [], ...basket })
  return render(
    <ToastProvider>
      <MemoryRouter><ReviewBasketPage /></MemoryRouter>
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('ResizeObserver', class { observe() {}; disconnect() {}; unobserve() {} })
})

describe('ReviewBasketPage reasons', () => {
  it('says why a point that is weak, unblocked or decayed is in the basket', async () => {
    renderBasket({
      weak: [item('passive', 'PRIORITY'), item('tense', 'UNBLOCKED', { reviewId: 'rev-1' })],
      due: [item('articles', 'DECAYED', { tier: 'INSUFFICIENT' })],
    })

    const weak = await screen.findByRole('region', { name: /Cần ưu tiên/ })
    expect(within(weak).getByText('Còn yếu')).toBeInTheDocument()
    expect(within(weak).getByText('Bài ôn chưa đạt')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: /Đến hạn ôn/ })).getByText('Lâu chưa ôn')).toBeInTheDocument()
  })

  it('adds no reason chip for a point whose tier already says it', async () => {
    renderBasket({ consolidate: [item('lexis', 'CONSOLIDATE', { tier: 'CONSOLIDATE', mastery: 0.7 })] })

    const section = await screen.findByRole('region', { name: /Nên củng cố/ })
    expect(within(section).queryByText('Còn yếu')).not.toBeInTheDocument()
    expect(within(section).queryByText('Lâu chưa ôn')).not.toBeInTheDocument()
  })

  it('resumes an unblocked review instead of starting a new one', async () => {
    renderBasket({ weak: [item('tense', 'UNBLOCKED', { reviewId: 'rev-1' })] })

    expect(await screen.findByRole('link', { name: /Tiếp tục ôn/ })).toHaveAttribute('href', '/learn/reviews/rev-1')
  })

  it('cannot start a weak point that has no unseen set', async () => {
    renderBasket({ weak: [item('passive', 'PRIORITY', { hasUnrevealedSet: false })] })

    expect(await screen.findByRole('button', { name: 'Bắt đầu ôn' })).toBeDisabled()
    expect(screen.getByText('Chưa có bộ đề mới')).toBeInTheDocument()
  })
})
