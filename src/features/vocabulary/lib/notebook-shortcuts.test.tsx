import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { isTypingTarget, useNotebookShortcuts, type NotebookShortcutHandlers } from './notebook-shortcuts'

function Harness(props: NotebookShortcutHandlers & { withDialog?: boolean }) {
  useNotebookShortcuts(props)
  return (
    <>
      <input aria-label="ô gõ" />
      {props.withDialog && <div role="dialog">popup</div>}
    </>
  )
}

function setup(withDialog = false) {
  const handlers = { onSelectTab: vi.fn(), onReview: vi.fn(), onFocusSearch: vi.fn() }
  const view = render(<Harness {...handlers} withDialog={withDialog} />)
  return { ...handlers, view }
}

describe('isTypingTarget', () => {
  it('recognises text fields and ignores plain elements', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true)
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})

describe('useNotebookShortcuts', () => {
  it('maps 1–3 to tabs, R to review and / to search', () => {
    const { onSelectTab, onReview, onFocusSearch } = setup()
    fireEvent.keyDown(document.body, { key: '2' })
    fireEvent.keyDown(document.body, { key: 'r' })
    fireEvent.keyDown(document.body, { key: '/' })
    expect(onSelectTab).toHaveBeenCalledWith(1)
    expect(onReview).toHaveBeenCalledTimes(1)
    expect(onFocusSearch).toHaveBeenCalledTimes(1)
  })

  it('stays out of the way while the learner types', () => {
    const { onSelectTab, onReview, view } = setup()
    const field = view.getByLabelText('ô gõ')
    fireEvent.keyDown(field, { key: '1' })
    fireEvent.keyDown(field, { key: 'r' })
    expect(onSelectTab).not.toHaveBeenCalled()
    expect(onReview).not.toHaveBeenCalled()
  })

  it('ignores keys with a modifier and keys pressed while a popup is open', () => {
    const plain = setup()
    fireEvent.keyDown(document.body, { key: 'r', ctrlKey: true })
    expect(plain.onReview).not.toHaveBeenCalled()
    plain.view.unmount()

    const withPopup = setup(true)
    fireEvent.keyDown(document.body, { key: '1' })
    expect(withPopup.onSelectTab).not.toHaveBeenCalled()
  })
})
