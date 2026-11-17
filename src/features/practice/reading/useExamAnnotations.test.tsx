import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { useExamAnnotations } from './useExamAnnotations'
import type { Annotation } from './useExamAnnotations'

const PASSAGE = 'In many villages a single solar panel powers a few lamps.'

function Harness({ autoAction = null, menuOnSelection, onNoteAdded }: {
  autoAction?: Annotation['kind'] | null
  menuOnSelection?: boolean
  onNoteAdded?: () => void
}) {
  const passage = useRef<HTMLParagraphElement>(null)
  const questions = useRef<HTMLDivElement>(null)
  const annotations = useExamAnnotations({ enabled: true, sectionId: 'part-1', passageRef: passage, questionsRef: questions, autoAction, menuOnSelection, onNoteAdded })
  return (
    <div>
      <p ref={passage} data-testid="passage">{PASSAGE}</p>
      <div ref={questions} />
      <output data-testid="notes">{annotations.notes.length}</output>
      <output data-testid="popup">{annotations.popup ? 'open' : 'closed'}</output>
      <output data-testid="waiting">{annotations.hasSelection ? 'yes' : 'no'}</output>
      <button onClick={() => annotations.note()} type="button">mark as note</button>
    </div>
  )
}

/** Selects "solar panel" in the passage the way a drag does: the selection changes, then the pointer is released. */
function dragOverText() {
  const text = screen.getByTestId('passage').firstChild as Text
  const start = PASSAGE.indexOf('solar panel')
  const range = document.createRange()
  range.setStart(text, start)
  range.setEnd(text, start + 'solar panel'.length)
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
  fireEvent(document, new Event('selectionchange'))
}

const releasePointer = async () => {
  fireEvent.pointerUp(document.body)
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)) })
}

describe('marking a selection of the passage', () => {
  beforeAll(() => {
    // jsdom has no layout, so a range has no boxes; the popup falls back to the last pointer position.
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  })
  afterEach(() => window.getSelection()?.removeAllRanges())

  it('asks what to do with the selection when no pen is chosen, and marks nothing by itself', async () => {
    render(<Harness />)

    dragOverText()
    await releasePointer()

    expect(screen.getByTestId('popup')).toHaveTextContent('open')
    expect(screen.getByTestId('notes')).toHaveTextContent('0')
    expect(window.getSelection()?.isCollapsed).toBe(false)
  })

  it('opens no card for a selection where a tool rail does the marking, but keeps the selection waiting for it', async () => {
    render(<Harness menuOnSelection={false} />)

    dragOverText()
    await releasePointer()

    expect(screen.getByTestId('popup')).toHaveTextContent('closed')
    expect(screen.getByTestId('waiting')).toHaveTextContent('yes')
    expect(window.getSelection()?.isCollapsed).toBe(false)
    expect(screen.getByTestId('notes')).toHaveTextContent('0')

    fireEvent.click(screen.getByRole('button', { name: 'mark as note' }))
    expect(screen.getByTestId('notes')).toHaveTextContent('1')
    expect(screen.getByTestId('waiting')).toHaveTextContent('no')
  })

  it('says a selection is waiting only while there is one', async () => {
    render(<Harness menuOnSelection={false} />)
    expect(screen.getByTestId('waiting')).toHaveTextContent('no')

    dragOverText()
    expect(screen.getByTestId('waiting')).toHaveTextContent('yes')

    window.getSelection()?.removeAllRanges()
    fireEvent(document, new Event('selectionchange'))
    expect(screen.getByTestId('waiting')).toHaveTextContent('no')
  })

  it('adds a note and opens the notes panel as soon as the pointer is released when the note pen is chosen', async () => {
    const onNoteAdded = vi.fn()
    render(<Harness autoAction="note" onNoteAdded={onNoteAdded} />)

    dragOverText()
    // Still dragging: nothing is marked and no popup gets in the way.
    expect(screen.getByTestId('notes')).toHaveTextContent('0')
    expect(screen.getByTestId('popup')).toHaveTextContent('closed')
    await releasePointer()

    expect(screen.getByTestId('notes')).toHaveTextContent('1')
    expect(onNoteAdded).toHaveBeenCalledOnce()
    expect(screen.getByTestId('popup')).toHaveTextContent('closed')
    expect(window.getSelection()?.isCollapsed).toBe(true)
  })

  it('highlights as soon as the pointer is released when the highlight pen is chosen, without making a note', async () => {
    const onNoteAdded = vi.fn()
    render(<Harness autoAction="highlight" onNoteAdded={onNoteAdded} />)

    dragOverText()
    expect(window.getSelection()?.isCollapsed).toBe(false)
    await releasePointer()

    // The selection was taken over by the highlight, and no note or panel came with it.
    expect(window.getSelection()?.isCollapsed).toBe(true)
    expect(screen.getByTestId('popup')).toHaveTextContent('closed')
    expect(screen.getByTestId('notes')).toHaveTextContent('0')
    expect(onNoteAdded).not.toHaveBeenCalled()
  })

  it('marks one selection once, and ignores a release with nothing selected', async () => {
    const onNoteAdded = vi.fn()
    render(<Harness autoAction="note" onNoteAdded={onNoteAdded} />)

    await releasePointer()
    expect(screen.getByTestId('notes')).toHaveTextContent('0')

    dragOverText()
    await releasePointer()
    await releasePointer()
    expect(screen.getByTestId('notes')).toHaveTextContent('1')
    expect(onNoteAdded).toHaveBeenCalledOnce()
  })
})
