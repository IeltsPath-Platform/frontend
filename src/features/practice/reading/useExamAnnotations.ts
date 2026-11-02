import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { highlightRegistry, paint } from './customHighlight'

/** Exam layout: highlights and notes the learner puts on the passage and on the questions. */

export type AnnotationPane = 'passage' | 'questions'

export interface Annotation {
  id: string
  pane: AnnotationPane
  kind: 'highlight' | 'note'
  /** Character offsets into the text of the pane, so they survive React re-rendering the markup. */
  start: number
  end: number
  text: string
  note: string
}

export interface AnnotationPopup {
  x: number
  y: number
  /** True when there is no room above the text, so the popup goes below it. */
  below: boolean
  /** Set when the click landed on an existing highlight or note: the popup then offers to clear it. */
  annotationId: string | null
  /** What the clicked annotation is; null for a fresh selection. */
  kind: Annotation['kind'] | null
  /** The part that was open when the popup appeared; it is dropped once another part opens. */
  sectionId: string | undefined
}

const PANES: AnnotationPane[] = ['passage', 'questions']
const HIGHLIGHT_NAME = 'rw-exam-highlight'
const NOTE_NAME = 'rw-exam-note'

function textOffset(container: Node, node: Node, offset: number) {
  const range = document.createRange()
  range.selectNodeContents(container)
  range.setEnd(node, offset)
  return range.toString().length
}

function rangeAt(container: Node, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let seen = 0
  let started = false
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.nodeValue?.length ?? 0
    if (!started && start < seen + length) { range.setStart(node, start - seen); started = true }
    if (started && end <= seen + length) { range.setEnd(node, end - seen); return range }
    seen += length
  }
  return null
}

interface PendingSelection { pane: AnnotationPane; start: number; end: number; text: string }

/** The part of a live selection that lies in the pane, as text offsets; null when nothing but white space is selected. */
function readSelection(container: HTMLElement, pane: AnnotationPane, range: Range): PendingSelection | null {
  const startInside = container.contains(range.startContainer)
  const endInside = container.contains(range.endContainer)
  if (!startInside && !endInside) return null
  const clipped = range.cloneRange()
  if (!startInside) clipped.setStart(container, 0)
  if (!endInside) clipped.setEnd(container, container.childNodes.length)
  const raw = clipped.toString()
  const text = raw.trim()
  if (!text) return null
  const start = textOffset(container, clipped.startContainer, clipped.startOffset) + (raw.length - raw.trimStart().length)
  return { pane, start, end: start + text.length, text }
}

export function useExamAnnotations({ enabled, sectionId, passageRef, questionsRef }: {
  enabled: boolean
  sectionId: string | undefined
  passageRef: RefObject<HTMLElement | null>
  questionsRef: RefObject<HTMLElement | null>
}) {
  const [bySection, setBySection] = useState<Record<string, Annotation[]>>({})
  const [popup, setPopup] = useState<AnnotationPopup | null>(null)
  const [focusNoteId, setFocusNoteId] = useState<string | null>(null)
  const pendingRef = useRef<PendingSelection | null>(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const containers = useMemo<Record<AnnotationPane, RefObject<HTMLElement | null>>>(() => ({ passage: passageRef, questions: questionsRef }), [passageRef, questionsRef])
  const current = useMemo(() => (sectionId ? bySection[sectionId] ?? [] : []), [bySection, sectionId])
  const currentRef = useRef(current)
  useEffect(() => { currentRef.current = current })

  const update = useCallback((change: (list: Annotation[]) => Annotation[]) => {
    if (!sectionId) return
    setBySection((all) => ({ ...all, [sectionId]: change(all[sectionId] ?? []) }))
  }, [sectionId])

  // Colour behind the annotated text; the ranges are rebuilt after every render because React may replace text nodes.
  useLayoutEffect(() => {
    if (!enabled || !highlightRegistry()) return
    const ranges: Record<Annotation['kind'], Range[]> = { highlight: [], note: [] }
    for (const item of current) {
      const container = containers[item.pane].current
      const range = container ? rangeAt(container, item.start, item.end) : null
      if (range) ranges[item.kind].push(range)
    }
    paint(HIGHLIGHT_NAME, ranges.highlight)
    paint(NOTE_NAME, ranges.note)
  })

  useEffect(() => () => {
    const registry = highlightRegistry()
    registry?.delete(HIGHLIGHT_NAME)
    registry?.delete(NOTE_NAME)
  }, [])

  useEffect(() => {
    if (!enabled) return
    function show(x: number, top: number, bottom: number, hit: Annotation | null) {
      const below = top < 90
      setPopup({ x: Math.min(Math.max(x, 80), window.innerWidth - 80), y: below ? bottom + 10 : top - 10, below, annotationId: hit?.id ?? null, kind: hit?.kind ?? null, sectionId })
    }

    function evaluate() {
      const live = window.getSelection()
      pendingRef.current = null
      if (!live || !live.rangeCount) { setPopup(null); return }
      const range = live.getRangeAt(0)
      for (const pane of PANES) {
        const container = containers[pane].current
        if (!container) continue
        if (live.isCollapsed) {
          if (!container.contains(range.startContainer)) continue
          const offset = textOffset(container, range.startContainer, range.startOffset)
          const hit = currentRef.current.find((item) => item.pane === pane && offset > item.start && offset < item.end)
          if (hit) {
            // Anchor to the marked text itself (the line under the pointer when it wraps), not to wherever the pointer last was.
            const rects = Array.from(rangeAt(container, hit.start, hit.end)?.getClientRects() ?? [])
            const { x, y } = pointerRef.current
            const rect = rects.find((box) => y >= box.top - 2 && y <= box.bottom + 2 && x >= box.left - 2 && x <= box.right + 2) ?? rects[0]
            if (rect) show(rect.left + rect.width / 2, rect.top, rect.bottom, hit)
            else setPopup(null)
            return
          }
          continue
        }
        const picked = readSelection(container, pane, range)
        if (!picked) continue
        pendingRef.current = picked
        const rect = range.getClientRects()[0]
        if (rect) show(rect.left + rect.width / 2, rect.top, rect.bottom, null)
        else show(pointerRef.current.x, pointerRef.current.y, pointerRef.current.y, null)
        return
      }
      setPopup(null)
    }

    // Selecting text must not also pick the answer under the mouse: a click that ends a drag is dropped.
    function keepAnswers(event: MouseEvent) {
      const live = window.getSelection()
      const container = containers.questions.current
      if (live && !live.isCollapsed && container?.contains(live.anchorNode)) { event.preventDefault(); event.stopPropagation() }
    }
    function rememberPointer(event: PointerEvent) { pointerRef.current = { x: event.clientX, y: event.clientY } }

    const questions = containers.questions.current
    questions?.addEventListener('click', keepAnswers, true)
    document.addEventListener('pointerdown', rememberPointer, true)
    document.addEventListener('pointerup', rememberPointer, true)
    document.addEventListener('selectionchange', evaluate)
    document.addEventListener('scroll', evaluate, true)
    return () => {
      questions?.removeEventListener('click', keepAnswers, true)
      document.removeEventListener('pointerdown', rememberPointer, true)
      document.removeEventListener('pointerup', rememberPointer, true)
      document.removeEventListener('selectionchange', evaluate)
      document.removeEventListener('scroll', evaluate, true)
    }
  }, [enabled, containers, sectionId])

  function add(kind: Annotation['kind']) {
    const pending = pendingRef.current
    if (!pending) return
    const id = crypto.randomUUID()
    update((list) => {
      if (kind === 'note') return [...list, { id, pane: pending.pane, kind, start: pending.start, end: pending.end, text: pending.text, note: '' }]
      // Highlights that overlap or touch become one.
      const touching = list.filter((item) => item.kind === 'highlight' && item.pane === pending.pane && item.start <= pending.end && item.end >= pending.start)
      const start = Math.min(pending.start, ...touching.map((item) => item.start))
      const end = Math.max(pending.end, ...touching.map((item) => item.end))
      const container = containers[pending.pane].current
      const text = (container ? rangeAt(container, start, end)?.toString() : null) ?? pending.text
      return [...list.filter((item) => !touching.includes(item)), { id, pane: pending.pane, kind, start, end, text, note: '' }]
    })
    if (kind === 'note') setFocusNoteId(id)
    pendingRef.current = null
    setPopup(null)
    window.getSelection()?.removeAllRanges()
  }

  const remove = useCallback((id: string) => update((list) => list.filter((item) => item.id !== id)), [update])

  const removeNotes = useCallback(() => update((list) => list.filter((item) => item.kind !== 'note')), [update])

  function clear() {
    if (popup?.annotationId && popup.sectionId === sectionId) remove(popup.annotationId)
    setPopup(null)
    window.getSelection()?.removeAllRanges()
  }

  const notes = useMemo(() => current.filter((item) => item.kind === 'note'), [current])

  return {
    popup: popup && popup.sectionId === sectionId ? popup : null,
    notes,
    focusNoteId,
    highlight: () => add('highlight'),
    note: () => add('note'),
    clear,
    remove,
    /** Takes every note of the open part away; highlights stay. */
    removeNotes,
    setNoteText: (id: string, note: string) => update((list) => list.map((item) => (item.id === id ? { ...item, note } : item))),
    noteFocused: () => setFocusNoteId(null),
    /** Brings the note under the popup to the front of the notes panel. */
    openNote: () => {
      if (popup?.annotationId && popup.sectionId === sectionId) setFocusNoteId(popup.annotationId)
      setPopup(null)
      window.getSelection()?.removeAllRanges()
    },
  }
}
