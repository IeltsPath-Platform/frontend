import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthShell } from './AuthShell'

vi.mock('@/components/SiteNavbar', () => ({
  SiteNavbar: () => <header data-testid="site-header" />,
}))

vi.mock('@/components/InteractiveCanvasBackground', () => ({
  InteractiveCanvasBackground: () => null,
}))

vi.mock('@/components/ClassMascot', () => ({
  ClassMascot: () => null,
}))

describe('AuthShell header visibility', () => {
  it('omits the site header when requested', () => {
    render(<AuthShell showNavbar={false}><p>Đăng nhập</p></AuthShell>)
    expect(screen.queryByTestId('site-header')).toBeNull()
  })

  it('keeps the site header by default on other auth screens', () => {
    render(<AuthShell><p>Khôi phục mật khẩu</p></AuthShell>)
    expect(screen.getByTestId('site-header')).toBeInTheDocument()
  })
})
