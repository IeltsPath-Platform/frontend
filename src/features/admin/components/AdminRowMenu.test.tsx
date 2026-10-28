import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { AdminRowMenu } from './AdminRowMenu'

const ITEMS = [{ key: 'a', label: 'Một', onSelect: vi.fn() }, { key: 'b', label: 'Hai', onSelect: vi.fn() }]

/** jsdom does no layout: give the button a place on the page and the menu a height. */
function layout({ buttonTop, buttonBottom, menuHeight, viewport }: { buttonTop: number; buttonBottom: number; menuHeight: number; viewport: number }) {
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(viewport)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(menuHeight)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    { top: buttonTop, bottom: buttonBottom, left: 900, right: 936, width: 36, height: buttonBottom - buttonTop, x: 900, y: buttonTop, toJSON: () => ({}) },
  )
}

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Hành động' }))
  return screen.getByRole('menu', { name: 'Hành động' })
}

describe('AdminRowMenu placement', () => {
  afterEach(() => vi.restoreAllMocks())

  it('opens below the button when there is room', async () => {
    layout({ buttonTop: 100, buttonBottom: 136, menuHeight: 300, viewport: 800 })
    render(<AdminRowMenu items={ITEMS} label="Hành động" />)

    expect((await openMenu()).style.top).toBe('142px')
  })

  it('opens above the button when the rows at the bottom of the page leave no room below', async () => {
    layout({ buttonTop: 700, buttonBottom: 736, menuHeight: 300, viewport: 800 })
    render(<AdminRowMenu items={ITEMS} label="Hành động" />)

    expect((await openMenu()).style.top).toBe('394px')
  })

  it('rests against the bottom edge when it fits neither above nor below', async () => {
    layout({ buttonTop: 150, buttonBottom: 186, menuHeight: 700, viewport: 800 })
    render(<AdminRowMenu items={ITEMS} label="Hành động" />)

    expect((await openMenu()).style.top).toBe('92px')
  })

  it('caps the height to the window so a long menu scrolls instead of being cut off', async () => {
    layout({ buttonTop: 100, buttonBottom: 136, menuHeight: 300, viewport: 800 })
    render(<AdminRowMenu items={ITEMS} label="Hành động" />)

    const menu = await openMenu()
    expect(menu.style.overflowY).toBe('auto')
    expect(menu.style.maxHeight).toContain('100dvh')
  })
})
