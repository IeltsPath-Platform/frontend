import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { UserTierDropdown } from './UserTierDropdown'

function renderDropdown(props: Partial<React.ComponentProps<typeof UserTierDropdown>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Routes>
        <Route path="/home" element={<UserTierDropdown userName="Nguyễn Văn An" {...props} />} />
        <Route path="/learn/progress" element={<p>Trang thành tích</p>} />
        <Route path="/overview" element={<p>Trang tổng quan</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('UserTierDropdown', () => {
  it('puts the profile first, then the achievements, and no longer offers the demo plan switch', () => {
    renderDropdown()
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/overview?tab=profile', '/learn/progress'])
    expect(links[0]).toHaveTextContent('Hồ sơ của tôi')
    expect(screen.queryByRole('button', { name: /Chuyển sang/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Chỉ mô phỏng/)).not.toBeInTheDocument()
  })

  it('greets the learner by given name and shows the email and points', () => {
    renderDropdown({ email: 'an@example.test', points: 1250 })
    expect(screen.getByRole('heading', { name: 'Xin chào, An!' })).toBeInTheDocument()
    expect(screen.getByText('an@example.test')).toBeInTheDocument()
    expect(screen.getAllByText(/1\.250 Points/).length).toBeGreaterThan(0)
  })

  it('shows the avatar photo in the trigger and the menu, and falls back to initials when it fails to load', () => {
    const { container } = renderDropdown({ avatarUrl: 'https://cdn.example.test/me.png' })
    const images = container.querySelectorAll('img')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', 'https://cdn.example.test/me.png')

    fireEvent.error(images[0])

    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(screen.getAllByText('NV').length).toBeGreaterThan(0)
  })

  it('shows the initials when there is no avatar', () => {
    const { container } = renderDropdown({ avatarUrl: null })
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getAllByText('NV')).toHaveLength(2)
  })

  it('closes and opens the profile when the link is chosen', async () => {
    const user = userEvent.setup()
    renderDropdown()
    const trigger = screen.getByText('Nguyễn Văn An', { selector: 'strong' }).closest('summary')!
    await user.click(trigger)
    expect(trigger.closest('details')).toHaveAttribute('open')

    await user.click(screen.getByRole('link', { name: /Hồ sơ của tôi/ }))

    expect(await screen.findByText('Trang tổng quan')).toBeInTheDocument()
  })

  it('opens the achievements from the second link', async () => {
    renderDropdown()
    await userEvent.click(screen.getByRole('link', { name: /Thành tích của tôi/ }))
    expect(await screen.findByText('Trang thành tích')).toBeInTheDocument()
  })

  it('closes on Escape with focus back on the trigger, and on a click outside', async () => {
    const user = userEvent.setup()
    renderDropdown()
    const trigger = screen.getByText('Nguyễn Văn An', { selector: 'strong' }).closest('summary')!
    await user.click(trigger)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger.closest('details')).not.toHaveAttribute('open'))
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.click(document.body)
    await waitFor(() => expect(trigger.closest('details')).not.toHaveAttribute('open'))
  })

  it('keeps the sign out', async () => {
    const onSignOut = vi.fn()
    renderDropdown({ onSignOut })
    await userEvent.click(screen.getByRole('button', { name: /Đăng xuất/ }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
