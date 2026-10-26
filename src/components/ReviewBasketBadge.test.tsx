import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReviewBasketBadge } from './ReviewBasketBadge'

describe('ReviewBasketBadge', () => {
  it('shows nothing before the counts load or when nothing waits', () => {
    const { container, rerender } = render(<ReviewBasketBadge summary={null} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<ReviewBasketBadge summary={{ required: 0, due: 0 }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('adds the required reviews and the due points into one number, and says what is in it', () => {
    render(<ReviewBasketBadge summary={{ required: 2, due: 3 }} />)
    const badge = screen.getByRole('img', { name: '2 bài ôn bắt buộc, 3 bài đến hạn ôn' })
    expect(badge).toHaveTextContent('5')
    expect(badge).toHaveAttribute('data-urgent', 'true')
  })

  it('stays calm when points are only due', () => {
    render(<ReviewBasketBadge summary={{ required: 0, due: 4 }} />)
    const badge = screen.getByRole('img', { name: '4 bài đến hạn ôn' })
    expect(badge).toHaveTextContent('4')
    expect(badge).not.toHaveAttribute('data-urgent')
  })

  it('caps a large number', () => {
    render(<ReviewBasketBadge summary={{ required: 0, due: 240 }} />)
    expect(screen.getByRole('img')).toHaveTextContent('99+')
  })
})
