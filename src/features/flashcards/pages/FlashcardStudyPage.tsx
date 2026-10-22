import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, RotateCw, X } from 'lucide-react'
import { OwlHero } from '@/components/OwlHero'
import { Button } from '@/components/ui/button'
import { SiteNavbar } from '@/components/SiteNavbar'
import { flashcardApi, flashcardErrorMessage, type Flashcard } from '../api/flashcardApi'
import { FlashcardFace } from '../components/FlashcardFace'
import { OwlCoach } from '../components/OwlCoach'
import { getSpacedReviewReaction, type OwlReaction } from '../lib/owl-reactions'
import '../flashcards.css'

const BATCH = 20

/** Leitner session over due cards; a failed answer is retried with the same requestId so it counts once. */
export function FlashcardStudyPage() {
  const [params] = useSearchParams()
  const deckId = params.get('deckId') ?? undefined
  const [queue, setQueue] = useState<Flashcard[] | null>(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [score, setScore] = useState({ remembered: 0, forgot: 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [owlReaction, setOwlReaction] = useState<OwlReaction | null>(null)
  const lastOwlTextRef = useRef<string | null>(null)
  const pending = useRef<{ cardId: string; correct: boolean; requestId: string } | null>(null)

  const [round, setRound] = useState(0)

  useEffect(() => {
    let live = true
    flashcardApi.dueCards(deckId, BATCH).then((page) => { if (live) setQueue(page.items) },
      (reason) => { if (live) { setError(flashcardErrorMessage(reason)); setQueue([]) } })
    return () => { live = false }
  }, [deckId, round])

  function nextRound() {
    setQueue(null); setIndex(0); setFlipped(false); setScore({ remembered: 0, forgot: 0 }); setError('')
    setRound((value) => value + 1)
  }

  const card = queue?.[index]

  async function answer(correct: boolean) {
    if (!card || busy) return
    const attempt = pending.current?.cardId === card.id ? pending.current : { cardId: card.id, correct, requestId: crypto.randomUUID() }
    pending.current = attempt
    setBusy(true); setError('')

    const reaction = getSpacedReviewReaction(correct, lastOwlTextRef.current)
    lastOwlTextRef.current = reaction.text
    setOwlReaction(reaction)

    try {
      await flashcardApi.review(card.id, attempt.correct, attempt.requestId)
      pending.current = null
      setScore((value) => attempt.correct ? { ...value, remembered: value.remembered + 1 } : { ...value, forgot: value.forgot + 1 })
      setIndex((value) => value + 1); setFlipped(false)
    } catch (reason) {
      setError(`${flashcardErrorMessage(reason)} Nhấn lại để gửi đúng câu trả lời vừa rồi.`)
    } finally { setBusy(false) }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!card || (event.target instanceof HTMLElement && event.target.closest('input, textarea'))) return
      if (event.code === 'Space') { event.preventDefault(); setFlipped((value) => !value) }
      else if (flipped && event.key === '1') void answer(false)
      else if (flipped && event.key === '2') void answer(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const backTo = deckId ? `/flashcards/decks/${deckId}` : '/flashcards'
  return (
    <div className="flashcards-page">
      <SiteNavbar />
      <main className="flashcards-shell flashcards-study">
        <Link to={backTo} className="flashcards-back"><ArrowLeft size={16} aria-hidden="true" />Thoát ôn tập</Link>
        {error && <p role="alert" className="flashcard-error">{error}</p>}
        {queue === null ? <p className="flashcards-empty">Đang tải thẻ đến hạn…</p>
          : !card ? (
            <section className="flashcards-study-done">
              <OwlHero pose={score.remembered > 0 ? 'party' : 'cheer'} motion="hop" size="md" celebrateKey={score.remembered > 0 ? 'spaced-done' : null} alt="" />
              <h1>{queue.length === 0 ? 'Không có thẻ đến hạn' : 'Hoàn thành lượt ôn!'}</h1>
              {queue.length > 0 && <p>Nhớ {score.remembered} · Chưa nhớ {score.forgot}</p>}
              <div>
                {queue.length === BATCH && <Button onClick={nextRound}><RotateCw />Ôn tiếp</Button>}
                <Button variant="outline" asChild><Link to={backTo}>Quay lại</Link></Button>
              </div>
            </section>
          ) : (
            <div className="study-layout-with-coach">
              <div className="study-main-col">
                <section aria-label="Thẻ đang ôn">
                  <div className="deck-browser-progress flashcards-study-progress">
                    <span><b>Tiến độ ôn</b> {index}/{queue.length}</span><em>{Math.round((index / queue.length) * 100)}%</em>
                    <div role="progressbar" aria-label="Tiến độ ôn" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index}><i style={{ inlineSize: `${(index / queue.length) * 100}%` }} /></div>
                  </div>
                  <FlashcardFace card={card} flipped={flipped} onFlip={() => setFlipped((value) => !value)} />
                  <p className="flashcard-hint flashcards-study-keys">Space: lật thẻ · 1: chưa nhớ · 2: đã nhớ · Hộp hiện tại {card.leitnerBox}/5</p>
                  <div className="flashcards-study-actions">
                    {flipped ? <>
                      <Button variant="outline" disabled={busy} onClick={() => void answer(false)}><X />Chưa nhớ (1)</Button>
                      <Button disabled={busy} onClick={() => void answer(true)}><Check />Đã nhớ (2)</Button>
                    </> : <Button onClick={() => setFlipped(true)}><RotateCw />Lật thẻ</Button>}
                  </div>
                </section>
              </div>
              <OwlCoach
                pose={owlReaction?.pose ?? 'confident'}
                motion={owlReaction?.motion ?? 'calm'}
                celebrateKey={owlReaction?.celebrateKey}
                message={owlReaction?.text}
                tone={owlReaction?.tone ?? 'info'}
                effect={owlReaction?.effect}
              />
            </div>
          )}
      </main>
    </div>
  )
}
