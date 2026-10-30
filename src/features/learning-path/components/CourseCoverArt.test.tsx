import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CourseCoverArt } from './CourseCoverArt'

describe('CourseCoverArt', () => {
  it('uses the course cover and falls back to band art when loading fails', () => {
    const { container } = render(<CourseCoverArt band={5.5} coverImageUrl="https://example.com/cover.jpg" />)
    const image = container.querySelector('img')!
    expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg')
    expect(image).toHaveAttribute('alt', '')

    fireEvent.error(image)

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg.lp-art')).toBeInTheDocument()
  })
})
