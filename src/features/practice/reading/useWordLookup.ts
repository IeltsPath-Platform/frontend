import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { lookupWord } from './wordLookupApi'
import type { WordEntry } from './wordLookupApi'

/** Practice layout: click a word in the passage to see what the vocabulary library says about it. */

export type WordLookupState =
  | { word: string; rect: DOMRect; status: 'loading' }
  | { word: string; rect: DOMRect; status: 'found'; entry: WordEntry }
  | { word: string; rect: DOMRect; status: 'missing' }
  | { word: string; rect: DOMRect; status: 'error' }

interface CaretDocument {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  caretRangeFromPoint?: (x: number, y: number) => Range | null
}

/** The English word under a point of the screen and where it is drawn; null when the point is not on a word. */
export function wordAtPoint(x: number, y: number): { word: string; rect: DOMRect } | null {
  const doc = document as unknown as CaretDocument
  let node: Node | null = null
  let offset = 0
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y)
    if (position) { node = position.offsetNode; offset = position.offset }
  } else if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y)
    if (range) { node = range.startContainer; offset = range.startOffset }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null
  const text = node.nodeValue ?? ''
  const inWord = (char: string | undefined) => char !== undefined && /[A-Za-z’']/.test(char)
  let start = offset
  let end = offset
  while (start > 0 && inWord(text[start - 1])) start -= 1
  while (end < text.length && inWord(text[end])) end += 1
  const word = text.slice(start, end).replace(/^['’]+|['’]+$/g, '')
  if (!/[A-Za-z]{2,}/.test(word)) return null
  const range = document.createRange()
  range.setStart(node, start)
  range.setEnd(node, end)
  const rect = range.getBoundingClientRect()
  // A caret position snaps to the nearest text, so make sure the click really landed on the word.
  if (x < rect.left - 2 || x > rect.right + 2 || y < rect.top - 2 || y > rect.bottom + 2) return null
  return { word, rect }
}

export function useWordLookup(enabled: boolean) {
  const [state, setState] = useState<WordLookupState | null>(null)
  const controller = useRef<AbortController | null>(null)

  const close = useCallback(() => {
    controller.current?.abort()
    setState(null)
  }, [])

  const search = useCallback((word: string, rect: DOMRect) => {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setState({ word, rect, status: 'loading' })
    void lookupWord(word, request.signal).then((entry) => {
      if (request.signal.aborted) return
      setState(entry ? { word, rect, status: 'found', entry } : { word, rect, status: 'missing' })
    }).catch(() => {
      if (!request.signal.aborted) setState({ word, rect, status: 'error' })
    })
  }, [])

  // Click on the passage: a click that ends a text selection, or lands on a highlight (which takes it off), is not a lookup.
  const onClick = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!enabled) return
    if (!window.getSelection()?.isCollapsed) return
    if ((event.target as Element).closest('mark')) return
    const hit = wordAtPoint(event.clientX, event.clientY)
    if (hit) search(hit.word, hit.rect)
    else close()
  }, [enabled, search, close])

  const retry = useCallback(() => {
    if (state) search(state.word, state.rect)
  }, [state, search])

  useEffect(() => {
    if (!state) return
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state, close])

  useEffect(() => () => controller.current?.abort(), [])

  return { state: enabled ? state : null, onClick, close, retry }
}
