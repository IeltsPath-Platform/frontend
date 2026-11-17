import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReadingToolRail } from './ReadingWorkspaceParts'
import type { ReadingTool } from './ReadingWorkspaceParts'
import { useToolShortcuts } from './useToolShortcuts'

describe('the practice tool rail of the reading page', () => {
  const show = (tool: ReadingTool | null) => {
    const onPick = vi.fn()
    const view = render(<ReadingToolRail tool={tool} onPick={onPick} />)
    return { onPick, ...view }
  }

  it('names the three tools with their keys', () => {
    show(null)

    expect(screen.getByRole('button', { name: /Highlight/ })).toHaveAttribute('aria-keyshortcuts', 'H')
    expect(screen.getByRole('button', { name: /Note/ })).toHaveAttribute('aria-keyshortcuts', 'N')
    expect(screen.getByRole('button', { name: /Tra từ vựng/ })).toHaveAttribute('aria-keyshortcuts', 'T')
    expect(screen.getByText('Phím (H)')).toBeInTheDocument()
    expect(screen.getByText('Phím (N)')).toBeInTheDocument()
    expect(screen.getByText('Phím (T)')).toBeInTheDocument()
  })

  it.each<[ReadingTool, RegExp]>([
    ['highlight', /Highlight/],
    ['note', /Note/],
    ['lookup', /Tra từ vựng/],
  ])('shows %s as the one tool in use, and no other', (tool, name) => {
    show(tool)

    const pressed = screen.getAllByRole('button').filter((button) => button.getAttribute('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toHaveAccessibleName(name)
  })

  it('shows no tool as in use when none is chosen', () => {
    show(null)

    expect(screen.getAllByRole('button').filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(0)
  })

  it('hands the tool that was pressed to the page, and nothing else', async () => {
    const { onPick } = show('lookup')

    await userEvent.click(screen.getByRole('button', { name: /Note/ }))
    await userEvent.click(screen.getByRole('button', { name: /Highlight/ }))

    expect(onPick.mock.calls).toEqual([['note'], ['highlight']])
  })

  it('has no help text under the tools', () => {
    show('highlight')

    expect(screen.queryByText(/Bôi đen đoạn trong bài/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Clear để bỏ/)).not.toBeInTheDocument()
    expect(screen.queryByText(/xem nghĩa/)).not.toBeInTheDocument()
  })
})

describe('the keys of the practice tools', () => {
  const press = (key: string, init: KeyboardEventInit = {}, target: Element | Window = window) =>
    fireEvent.keyDown(target, { key, ...init })

  function mount(enabled = true) {
    const actions = { highlight: vi.fn(), note: vi.fn(), lookup: vi.fn() }
    const view = renderHook(({ on }) => useToolShortcuts(on, actions), { initialProps: { on: enabled } })
    return { actions, ...view }
  }

  it('maps H, N and T, in either case, to the Highlight, Note and Tra từ vựng tools', () => {
    const { actions } = mount()

    press('h')
    press('N')
    press('t')
    press('T')

    expect(actions.highlight).toHaveBeenCalledOnce()
    expect(actions.note).toHaveBeenCalledOnce()
    expect(actions.lookup).toHaveBeenCalledTimes(2)
  })

  it('ignores a key typed into a field, held with a modifier, or held down', () => {
    const { actions } = mount()
    const field = document.body.appendChild(document.createElement('textarea'))

    press('t', {}, field)
    press('t', { ctrlKey: true })
    press('t', { metaKey: true })
    press('t', { altKey: true })
    press('t', { repeat: true })
    press('x')
    field.remove()

    expect(actions.lookup).not.toHaveBeenCalled()
    expect(actions.highlight).not.toHaveBeenCalled()
  })

  it('does nothing when the tools are off, as in the real exam layout', () => {
    const { actions } = mount(false)

    press('h')
    press('t')

    expect(actions.highlight).not.toHaveBeenCalled()
    expect(actions.lookup).not.toHaveBeenCalled()
  })

  it('calls the latest action after a re-render without attaching the listener again', () => {
    const first = vi.fn()
    const second = vi.fn()
    const add = vi.spyOn(window, 'addEventListener')
    const { rerender } = renderHook(({ lookup }) => useToolShortcuts(true, { highlight: vi.fn(), note: vi.fn(), lookup }), { initialProps: { lookup: first } })
    const attached = add.mock.calls.filter(([type]) => type === 'keydown').length

    rerender({ lookup: second })
    press('t')

    expect(second).toHaveBeenCalledOnce()
    expect(first).not.toHaveBeenCalled()
    expect(add.mock.calls.filter(([type]) => type === 'keydown').length).toBe(attached)
    add.mockRestore()
  })
})
