import { useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Pencil, RotateCcw, Volume2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { flashcardApi, flashcardErrorMessage, isMastered, type DeckItem } from '../api/flashcardApi'
import { OwlCoach } from './OwlCoach'
import { getBrowserMarkReaction, type OwlReaction } from '../lib/owl-reactions'
import { speak } from '../lib/speak'
import { FlashcardFace } from './FlashcardFace'

type Filter = 'all' | 'learning' | 'mastered'

interface DeckBrowserProps {
  items: DeckItem[]
  onEdit: (item: DeckItem) => void
  onRemove: (item: DeckItem) => void
}

/** Browse a deck one card at a time with filters and the full card table, following the lesson Flashcard tab design. */
export function DeckBrowser({ items, onEdit, onRemove }: DeckBrowserProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  // Results of toggles made on this page; deck items are not refetched after each review.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(() => new Map())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [owlReaction, setOwlReaction] = useState<OwlReaction | null>(null)
  const lastOwlTextRef = useRef<string | null>(null)

  const mastered = (item: DeckItem) => overrides.get(item.flashcardId) ?? isMastered(item)
  const masteredCount = items.filter(mastered).length
  const visible = filter === 'all' ? items : items.filter((item) => (filter === 'mastered') === mastered(item))
  const position = Math.min(index, Math.max(visible.length - 1, 0))
  const current = visible[position]
  const percent = items.length ? Math.round((masteredCount / items.length) * 100) : 0

  function go(next: number) { setIndex(next); setFlipped(false); setError('') }
  function choose(next: Filter) { setFilter(next); go(0) }

  /**
   * Toggles mastery by recording one Leitner review: "đã thuộc" is a correct answer (box +1), "quên rồi" is a miss
   * that sends the card back to box 1 and makes it due again, so the server state matches what the learner sees.
   */
  async function toggleLearned(item: DeckItem) {
    if (busy) return
    const learned = !mastered(item)
    setBusy(true); setError('')

    const reaction = getBrowserMarkReaction(learned, lastOwlTextRef.current)
    lastOwlTextRef.current = reaction.text
    setOwlReaction(reaction)

    try {
      await flashcardApi.review(item.flashcardId, learned, crypto.randomUUID())
      setOverrides((value) => new Map(value).set(item.flashcardId, learned))
    } catch (reason) { setError(flashcardErrorMessage(reason)) }
    finally { setBusy(false) }
  }

  return (
    <>
      <section className="deck-browser" aria-label="Duyệt thẻ">
        <div className="deck-browser-toolbar">
          <div className="deck-browser-filters" role="group" aria-label="Lọc thẻ">
            <button type="button" aria-pressed={filter === 'all'} onClick={() => choose('all')}>Tất cả ({items.length})</button>
            <button type="button" aria-pressed={filter === 'learning'} onClick={() => choose('learning')}>Chưa thuộc ({items.length - masteredCount})</button>
            <button type="button" className="is-mastered" aria-pressed={filter === 'mastered'} onClick={() => choose('mastered')}>Đã thuộc ({masteredCount})</button>
          </div>
          <div className="deck-browser-progress">
            <span><b>Tiến độ flashcard</b> {masteredCount}/{items.length}</span><em>{percent}%</em>
            <div><i style={{ inlineSize: `${percent}%` }} /></div>
          </div>
        </div>

        {current ? <>
          <FlashcardFace card={current} flipped={flipped} onFlip={() => setFlipped((value) => !value)} />
          {owlReaction && (
            <OwlCoach
              pose={owlReaction.pose}
              motion={owlReaction.motion}
              celebrateKey={owlReaction.celebrateKey}
              message={owlReaction.text}
              tone={owlReaction.tone}
              effect={owlReaction.effect}
            />
          )}
          {mastered(current) ? (
            <Button variant="outline" className="deck-browser-mark" disabled={busy} onClick={() => void toggleLearned(current)}>
              <RotateCcw />Quên rồi – đánh dấu chưa thuộc
            </Button>
          ) : (
            <Button variant="secondary" className="deck-browser-mark" disabled={busy} onClick={() => void toggleLearned(current)}>
              <Check />Đánh dấu đã thuộc
            </Button>
          )}
          {error && <p role="alert" className="flashcard-error">{error}</p>}
          <div className="deck-browser-nav">
            <Button variant="outline" disabled={position === 0} onClick={() => go(position - 1)}><ChevronLeft />Thẻ trước</Button>
            <div className="deck-browser-counter"><strong>{position + 1} / {visible.length}</strong><span><i style={{ inlineSize: `${((position + 1) / visible.length) * 100}%` }} /></span></div>
            <Button variant="outline" disabled={position >= visible.length - 1} onClick={() => go(position + 1)}>Thẻ sau<ChevronRight /></Button>
          </div>
        </> : <p className="flashcards-empty">Không có thẻ trong mục này.</p>}
      </section>

      <section className="deck-browser-table" aria-label="Tất cả thẻ">
        <h2>Tất cả thẻ ({items.length})</h2>
        <ol>
          {items.map((item, row) => (
            <li key={item.flashcardId} aria-current={item.flashcardId === current?.flashcardId ? 'true' : undefined}>
              <span>{row + 1}</span>
              <button type="button" className="deck-browser-row" onClick={() => { setFilter('all'); go(row) }}>
                <strong>{item.front}</strong><span>{item.back}</span>
              </button>
              <Button variant="ghost" size="icon-sm" aria-label={`Phát âm ${item.front}`} onClick={() => speak(item.front)}><Volume2 /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Sửa ${item.front}`} onClick={() => onEdit(item)}><Pencil /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Gỡ ${item.front} khỏi bộ`} onClick={() => onRemove(item)}><X /></Button>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
