import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PracticeCard } from '@/types/practice'
import { PracticeTestCard } from './PracticeTestCard'
import { PracticeCardSkeleton } from './PracticeCardSkeleton'

const card: PracticeCard = {
  id: 'full',
  title: 'Coral reefs',
  passageBadge: 'Section 4',
  skill: 'listening',
  imageUrl: 'https://media.example/practice/covers/reef.webp',
  bulletPoints: ['Gap Filling', '10 câu · 10 phút'],
  formatLabels: ['Gap Filling'],
  meta: '10 câu · 10 phút',
  questionsCount: 10,
}

describe('PracticeTestCard photo', () => {
  it('shimmers and hides the photo until it has loaded, then shows it', () => {
    const { container } = render(<PracticeTestCard card={card} onClick={vi.fn()} />)
    const photo = container.querySelector('img.card-photo')!

    expect(container.querySelector('.card-image-box')).toHaveClass('is-loading')
    expect(photo).not.toHaveClass('is-loaded')

    fireEvent.load(photo)

    expect(container.querySelector('.card-image-box')).not.toHaveClass('is-loading')
    expect(photo).toHaveClass('is-loaded')
  })

  it('shows the card anyway when the photo cannot be loaded', () => {
    const { container } = render(<PracticeTestCard card={card} onClick={vi.fn()} />)

    fireEvent.error(container.querySelector('img.card-photo')!)

    expect(container.querySelector('.card-image-box')).not.toHaveClass('is-loading')
  })

  it('does not shimmer a card that has no photo', () => {
    const { container } = render(<PracticeTestCard card={{ ...card, imageUrl: undefined }} onClick={vi.fn()} />)

    expect(container.querySelector('.card-image-box')).not.toHaveClass('is-loading')
    expect(container.querySelector('img')).toBeNull()
  })
})

describe('PracticeCardSkeleton', () => {
  it('has the frame of a card and nothing a screen reader should read', () => {
    const { container } = render(<PracticeCardSkeleton />)

    expect(container.firstElementChild).toHaveClass('practice-visual-card')
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.card-image-box')).not.toBeNull()
  })
})
