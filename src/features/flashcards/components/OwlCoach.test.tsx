import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OwlCoach } from './OwlCoach'

describe('OwlCoach', () => {
  it('renders speech bubble in aria-live polite region with text', () => {
    render(<OwlCoach message="Chuẩn luôn!" tone="success" pose="cheer" />)

    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    expect(liveRegion).toHaveTextContent('Chuẩn luôn!')
  })

  it('shows the streak badge from two correct answers and plays the effect particles', () => {
    const { container, rerender } = render(<OwlCoach message="Chuẩn luôn!" effect="stars" streak={1} />)
    expect(screen.queryByLabelText(/Chuỗi/)).toBeNull()
    expect(container.querySelector('.owl-coach-particles.fx-stars')).not.toBeNull()
    rerender(<OwlCoach message="3 câu liền mạch!" effect="confetti" streak={3} />)
    expect(screen.getByLabelText('Chuỗi 3 câu đúng')).toBeInTheDocument()
    expect(container.querySelector('.owl-coach-particles.fx-confetti')).not.toBeNull()
  })

  it('keeps text accessible for screen readers even when idle or rendered', () => {
    render(<OwlCoach message="Suýt nữa! Kiểm tra lại chính tả: environment" tone="warning" pose="idea" />)

    expect(screen.getByText(/Suýt nữa!/)).toBeInTheDocument()
  })
})

