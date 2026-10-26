import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { UserTierDropdown } from './UserTierDropdown'

function renderDropdown(props: Partial<React.ComponentProps<typeof UserTierDropdown>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Routes>
        <Route path="/home" element={<UserTierDropdown userName="Học viên" {...props} />} />
        <Route path="/learn/progress" element={<p>Trang thành tích</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('UserTierDropdown', () => {
  it('links to the achievements and no longer repeats hearts, XP and streak, which the owl shows', () => {
    renderDropdown()
    expect(screen.getByRole('link', { name: 'Thành tích của tôi' })).toHaveAttribute('href', '/learn/progress')
    expect(screen.queryByRole('region', { name: /Tim, XP và streak/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Streak')).not.toBeInTheDocument()
    expect(screen.queryByText('XP tích lũy')).not.toBeInTheDocument()
  })

  it('closes and opens the achievements when the link is chosen', async () => {
    const user = userEvent.setup()
    renderDropdown()
    const trigger = screen.getByText('Học viên').closest('summary')!
    await user.click(trigger)
    expect(trigger.closest('details')).toHaveAttribute('open')

    await user.click(screen.getByRole('link', { name: 'Thành tích của tôi' }))

    expect(await screen.findByText('Trang thành tích')).toBeInTheDocument()
  })

  it('closes on Escape with focus back on the trigger, and on a click outside', async () => {
    const user = userEvent.setup()
    renderDropdown()
    const trigger = screen.getByText('Học viên').closest('summary')!
    await user.click(trigger)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger.closest('details')).not.toHaveAttribute('open'))
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.click(document.body)
    await waitFor(() => expect(trigger.closest('details')).not.toHaveAttribute('open'))
  })

  it('keeps the plan switch and the sign out', async () => {
    const onToggleTier = vi.fn()
    const onSignOut = vi.fn()
    renderDropdown({ onToggleTier, onSignOut })
    await userEvent.click(screen.getByRole('button', { name: /Chuyển sang Premium/ }))
    await userEvent.click(screen.getByRole('button', { name: /Đăng xuất/ }))
    expect(onToggleTier).toHaveBeenCalledWith('PREMIUM')
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
