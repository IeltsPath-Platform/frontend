import { render, screen, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { menuEntriesFor } from './adminMenu'
import { AdminSidebar } from './AdminSidebar'

function renderSidebar(path = '/content-author/content') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminSidebar entries={menuEntriesFor(['CONTENT_AUTHOR'])} />
    </MemoryRouter>,
  )
}

const flyout = (name: string) => screen.getByRole('list', { name })

describe('AdminSidebar groups', () => {
  it('shows one button per group and keeps single screens as links', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: 'Tổng quan nội dung' })).toHaveAttribute('href', '/content-author/content')
    expect(screen.getByRole('link', { name: 'Việc cần làm' })).toHaveAttribute('href', '/content-author/work-items')
    for (const label of ['Chương trình học', 'Câu hỏi & đề', 'Chất lượng chấm']) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-expanded', 'false')
    }
  })

  it('lists every screen of a group as a link inside its sub-menu', () => {
    renderSidebar()
    const links = within(flyout('Câu hỏi & đề')).getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(links).toEqual(['/content-author/questions', '/content-author/packages', '/content-author/course-import', '/content-author/ai-drafts'])
  })

  it('opens the sub-menu when the pointer rests on the icon and closes it when the pointer leaves', async () => {
    const user = userEvent.setup()
    renderSidebar()
    const button = screen.getByRole('button', { name: 'Chương trình học' })

    await user.hover(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(flyout('Chương trình học')).toHaveClass('is-open')

    await user.unhover(button)
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(flyout('Chương trình học')).not.toHaveClass('is-open')
  })

  it('keeps the sub-menu open while the pointer moves from the icon onto it', async () => {
    const user = userEvent.setup()
    renderSidebar()
    const button = screen.getByRole('button', { name: 'Chương trình học' })

    await user.hover(button)
    await user.unhover(button)
    await user.hover(within(flyout('Chương trình học')).getByRole('link', { name: 'Cây tri thức' }))
    await new Promise((resolve) => setTimeout(resolve, 250))

    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens on click for keyboard users and closes on Escape', async () => {
    const user = userEvent.setup()
    renderSidebar()
    const button = screen.getByRole('button', { name: 'Chất lượng chấm' })

    button.focus()
    await user.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('closes when the user clicks elsewhere', async () => {
    const user = userEvent.setup()
    renderSidebar()
    const button = screen.getByRole('button', { name: 'Chương trình học' })

    await user.hover(button)
    await user.click(document.body)

    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('marks the group of the current screen as active and highlights the screen inside it', () => {
    renderSidebar('/content-author/packages/123')
    expect(screen.getByRole('button', { name: 'Câu hỏi & đề' })).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Chương trình học' })).not.toHaveClass('is-active')
    expect(screen.getByRole('link', { name: 'Đề & gói câu hỏi' })).toHaveClass('is-active')
  })

  it('closes the sub-menu after a screen is chosen', async () => {
    const user = userEvent.setup()
    renderSidebar('/content-author/content')
    const button = screen.getByRole('button', { name: 'Chương trình học' })

    await user.hover(button)
    await user.click(within(flyout('Chương trình học')).getByRole('link', { name: 'Cây tri thức' }))

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveClass('is-active')
  })
})
