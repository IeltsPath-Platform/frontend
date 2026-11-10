import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthShell } from './AuthShell'

vi.mock('@/components/SiteNavbar', () => ({
  SiteNavbar: () => <header data-testid="site-header" />,
}))

vi.mock('@/components/InteractiveCanvasBackground', () => ({
  InteractiveCanvasBackground: () => null,
}))

vi.mock('@/components/OwlHero', () => ({
  OwlHero: () => null,
}))

describe('AuthShell', () => {
  it('renders the site header and ambient copy on password recovery and OAuth screens', () => {
    render(<AuthShell ambientTitle="Khôi phục mật khẩu"><p>Biểu mẫu khôi phục</p></AuthShell>)
    expect(screen.getByTestId('site-header')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Khôi phục mật khẩu' })).toBeInTheDocument()
    expect(screen.getByText('Biểu mẫu khôi phục')).toBeInTheDocument()
  })
})
