import { useEffect, useRef, useState } from 'react'
import { Highlighter, Languages, Layers, StickyNote } from 'lucide-react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import type { PassageAction, PassageSelection, PracticeMode, TextHighlight } from '@/types/practice'
import { MOCK_PASSAGE_CONTENT } from '@/mocks/practiceData'
import { readPassageSelection } from '../lib/passageTools'

interface PracticePassageProps {
  mode: PracticeMode
  highlights: TextHighlight[]
  onSelection: (selection: PassageSelection | null) => void
  onAction: (action: PassageAction, selection: PassageSelection) => void
}

export function PracticePassage({ mode, highlights, onSelection, onAction }: PracticePassageProps) {
  const root = useRef<HTMLDivElement>(null)
  const [menuSelection, setMenuSelection] = useState<PassageSelection | null>(null)
  const pendingAction = useRef<PassageAction | null>(null)
  const menuOpen = useRef(false)

  useEffect(() => {
    if (mode !== 'practice') return
    const capture = () => {
      if (menuOpen.current) return
      const selection = window.getSelection()
      if (selection?.anchorNode && root.current?.contains(selection.anchorNode)) {
        onSelection(readPassageSelection(root.current))
      }
    }
    document.addEventListener('selectionchange', capture)
    return () => document.removeEventListener('selectionchange', capture)
  }, [mode, onSelection])

  function renderText(text: string, paragraph: string) {
    const segments = []
    let cursor = 0
    for (const range of highlights.filter((item) => item.paragraph === paragraph)) {
      segments.push(text.slice(cursor, range.start))
      const selectedText = text.slice(range.start, range.end)
      const selectMark = () => onSelection({ text: selectedText, ranges: [range] })
      segments.push(<mark key={`${paragraph}-${range.start}`} tabIndex={0} role="button" aria-label={`Chọn đoạn highlight: ${selectedText}`}
        onClick={selectMark} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectMark() } }}>{selectedText}</mark>)
      cursor = range.end
    }
    segments.push(text.slice(cursor))
    return segments
  }

  return (
    <section className="screen3-passage-card" aria-labelledby="passage-heading">
      <span className="practice-passage-label">READING · BÀI ĐỌC MINH HỌA</span>
      <h1 id="passage-heading" className="passage-main-heading">{MOCK_PASSAGE_CONTENT.title}</h1>
      {mode === 'practice' && <p className="practice-selection-hint">Bôi đen nội dung rồi nhấn chuột phải hoặc chọn công cụ. Nhấn một đoạn Highlight để chọn lại.</p>}
      {mode === 'practice' ? <ContextMenu onOpenChange={(open) => { menuOpen.current = open }}>
        {/* Bubble after Radix's trigger has opened, so preventDefault does not cancel its handler. */}
        <div onContextMenu={(event) => event.preventDefault()}>
          <ContextMenuTrigger asChild className="select-text" onContextMenu={(event) => {
            const selection = readPassageSelection(root.current)
            pendingAction.current = null
            if (!selection) { event.preventDefault(); return }
            setMenuSelection(selection)
            onSelection(selection)
          }}>
            <div ref={root} className="passage-paragraphs-flow" tabIndex={0} aria-label="Nội dung bài đọc">
              {MOCK_PASSAGE_CONTENT.paragraphs.map(({ letter, text }) => <p className="passage-para" key={letter}><strong>{letter}. </strong><span data-passage-text={letter}>{renderText(text, letter)}</span></p>)}
            </div>
          </ContextMenuTrigger>
        </div>
        <ContextMenuContent className="passage-context-menu" onCloseAutoFocus={(event) => {
          event.preventDefault()
          const action = pendingAction.current
          pendingAction.current = null
          if (action && menuSelection) onAction(action, menuSelection)
          else root.current?.focus({ preventScroll: true })
        }}>
          <ContextMenuItem disabled={!menuSelection} onSelect={() => { pendingAction.current = 'highlight' }}><Highlighter />Highlight</ContextMenuItem>
          <ContextMenuItem disabled={!menuSelection} onSelect={() => { pendingAction.current = 'note' }}><StickyNote />Note</ContextMenuItem>
          <ContextMenuItem disabled={!menuSelection} onSelect={() => { pendingAction.current = 'dictionary' }}><Languages />Tra từ vựng</ContextMenuItem>
          <ContextMenuItem disabled={!menuSelection} onSelect={() => { pendingAction.current = 'flashcard' }}><Layers />Tạo Flashcard</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu> : <div ref={root} className="passage-paragraphs-flow" aria-label="Nội dung bài đọc">
        {MOCK_PASSAGE_CONTENT.paragraphs.map(({ letter, text }) => <p className="passage-para" key={letter}><strong>{letter}. </strong><span data-passage-text={letter}>{text}</span></p>)}
      </div>}
      <p className="practice-demo-warning">Dữ liệu hiện có gồm đoạn A–E; đoạn F–G và nội dung riêng của từng đề chưa được cung cấp. Đây chưa phải bài thi hoàn chỉnh.</p>
    </section>
  )
}
