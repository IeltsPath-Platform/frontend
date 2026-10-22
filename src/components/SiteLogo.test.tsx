import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SiteLogo } from './SiteLogo'

describe('SiteLogo', () => {
  it('swaps to the bundled mark and brand name when the hosted logo fails to load', () => {
    render(<SiteLogo alt="The English Space" />)
    fireEvent.error(screen.getByRole('img', { name: 'The English Space' }))
    const fallback = screen.getByRole('img', { name: 'The English Space' })
    expect(fallback.tagName).toBe('SPAN')
    expect(fallback).toHaveTextContent('IELTS Space')
  })
})
