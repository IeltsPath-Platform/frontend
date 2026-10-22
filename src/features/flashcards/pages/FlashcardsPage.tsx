import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SiteNavbar } from '@/components/SiteNavbar'
import { useToast } from '@/components/toast/toastContext'
import { flashcardApi, flashcardErrorMessage, type Flashcard, type FlashcardDeck } from '../api/flashcardApi'
import { CardFormDialog } from '../components/CardFormDialog'
import { CardTile } from '../components/CardTile'
import { ConfirmDialog } from '../components/ConfirmDialog'
import '../flashcards.css'

const PAGE_SIZE = 50
type Tab = 'decks' | 'cards'
type Modal =
  | { kind: 'card'; card: Flashcard }
  | { kind: 'delete-deck'; deck: FlashcardDeck }
  | { kind: 'delete-card'; card: Flashcard }
  | null

export function FlashcardsPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'cards' ? 'cards' : 'decks'
  const navigate = useNavigate()
  const { toast } = useToast()
  const [decks, setDecks] = useState<FlashcardDeck[] | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [cardTotal, setCardTotal] = useState(0)
  const [cardPage, setCardPage] = useState(0)
  const [dueTotal, setDueTotal] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [modal, setModal] = useState<Modal>(null)

  const [reload, setReload] = useState(0)
  const refresh = () => setReload((value) => value + 1)

  useEffect(() => {
    let live = true
    const fail = (reason: unknown) => { if (live) setError(flashcardErrorMessage(reason)) }
    flashcardApi.listDecks(0, PAGE_SIZE).then((page) => { if (live) setDecks(page.items) }, (reason) => { fail(reason); if (live) setDecks([]) })
    flashcardApi.listCards(0, PAGE_SIZE).then((page) => {
      if (live) { setCards(page.items); setCardTotal(page.total); setCardPage(0) }
    }, fail)
    flashcardApi.dueCards(undefined, 1).then((page) => { if (live) setDueTotal(page.total) }, () => { if (live) setDueTotal(null) })
    return () => { live = false }
  }, [reload])

  async function loadMoreCards() {
    try {
      const page = await flashcardApi.listCards(cardPage + 1, PAGE_SIZE)
      setCards((current) => [...current, ...page.items]); setCardTotal(page.total); setCardPage(page.page)
    } catch (reason) { setError(flashcardErrorMessage(reason)) }
  }

  const keyword = query.trim().toLowerCase()
  const visibleCards = keyword ? cards.filter((card) => `${card.front} ${card.back}`.toLowerCase().includes(keyword)) : cards
  const visibleDecks = keyword ? decks?.filter((deck) => deck.name.toLowerCase().includes(keyword)) : decks

  return (
    <div className="flashcards-page">
      <SiteNavbar />
      <main className="flashcards-shell">
        <header className="flashcards-hero">
          <div>
            <p>IELTS SPACE FLASHCARDS</p>
            <h1>Flashcard của tôi</h1>
            <span>Tạo thẻ theo chủ đề, thêm ảnh minh họa và ôn lại đúng lúc sắp quên.</span>
          </div>
          <div className="flashcards-stats">
            <strong><Layers aria-hidden="true" size={18} />{decks?.length ?? '–'}<small>bộ thẻ</small></strong>
            <strong><BookOpen aria-hidden="true" size={18} />{cardTotal}<small>thẻ</small></strong>
            <Button className="flashcards-study-button" disabled={!dueTotal} onClick={() => navigate('/flashcards/study')}>
              Ôn {dueTotal ?? 0} thẻ đến hạn
            </Button>
          </div>
        </header>

        <div className="flashcards-toolbar">
          <div role="tablist" aria-label="Chế độ xem" className="flashcards-tabs">
            <button role="tab" aria-selected={tab === 'decks'} onClick={() => setParams({})}>Bộ thẻ theo chủ đề</button>
            <button role="tab" aria-selected={tab === 'cards'} onClick={() => setParams({ tab: 'cards' })}>Tất cả thẻ</button>
          </div>
          <label className="flashcards-search"><Search aria-hidden="true" size={16} />
            <Input value={query} placeholder={tab === 'decks' ? 'Tìm chủ đề' : 'Tìm trong thẻ đã tải'} onChange={(event) => setQuery(event.target.value)} />
          </label>
          {/* Cards are always created in rows through the deck editor; the dialog only edits one existing card. */}
          <Button onClick={() => navigate('/flashcards/decks/new')}><Plus />Tạo học phần</Button>
        </div>
        {error && <p role="alert" className="flashcard-error">{error}</p>}

        {tab === 'decks' ? (
          visibleDecks === null || visibleDecks === undefined ? <p className="flashcards-empty">Đang tải bộ thẻ…</p>
            : visibleDecks.length === 0 ? <EmptyDecks onCreate={() => navigate('/flashcards/decks/new')} filtered={Boolean(keyword)} />
              : <ul className="flashcards-deck-grid">{visibleDecks.map((deck) => (
                <li key={deck.id} className="flashcards-deck-card">
                  <Link to={`/flashcards/decks/${deck.id}`} className="flashcards-deck-link">
                    <div className="flashcards-deck-cover">{deck.coverImageUrl ? <img src={deck.coverImageUrl} alt="" loading="lazy" /> : <span>{deck.name.slice(0, 1).toUpperCase()}</span>}</div>
                    <h2>{deck.name}</h2>
                    {deck.description && <p>{deck.description}</p>}
                    {deck.cardCount !== undefined && <small>{deck.cardCount} thẻ{deck.dueCount ? ` · ${deck.dueCount} đến hạn` : ''}</small>}
                  </Link>
                  <div className="flashcards-deck-actions">
                    <Button variant="ghost" size="icon-sm" aria-label={`Sửa ${deck.name}`} onClick={() => navigate(`/flashcards/decks/${deck.id}/edit`)}><Pencil /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Xóa ${deck.name}`} onClick={() => setModal({ kind: 'delete-deck', deck })}><Trash2 /></Button>
                  </div>
                </li>))}</ul>
        ) : (
          <>
            {visibleCards.length === 0 ? <p className="flashcards-empty">{keyword ? 'Không có thẻ phù hợp.' : 'Chưa có thẻ nào. Nhấn “Tạo học phần” để thêm nhiều thẻ cùng lúc.'}</p>
              : <ul className="flashcards-card-grid">{visibleCards.map((card) => (
                <li key={card.id}><CardTile front={card.front} back={card.back} imageUrl={card.imageUrl} example={card.exampleSentence}
                  meta={`Hộp ${card.leitnerBox}/5`}
                  actions={<>
                    <Button variant="ghost" size="icon-sm" aria-label={`Sửa ${card.front}`} onClick={() => setModal({ kind: 'card', card })}><Pencil /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Xóa ${card.front}`} onClick={() => setModal({ kind: 'delete-card', card })}><Trash2 /></Button>
                  </>} /></li>))}</ul>}
            {cards.length < cardTotal && <Button variant="outline" className="flashcards-more" onClick={() => void loadMoreCards()}>Tải thêm thẻ</Button>}
          </>
        )}
      </main>

      {modal?.kind === 'card' && <CardFormDialog card={modal.card} decks={decks ?? []} onClose={() => setModal(null)} onSaved={() => {
        setModal(null); refresh()
        toast({ title: 'Đã cập nhật thẻ.', tone: 'success' })
      }} />}
      {modal?.kind === 'delete-deck' && <ConfirmDialog title={`Xóa bộ thẻ “${modal.deck.name}”?`}
        description="Chỉ xóa bộ thẻ. Các thẻ bên trong vẫn còn trong “Tất cả thẻ”." confirmLabel="Xóa bộ thẻ"
        onClose={() => setModal(null)} onConfirm={async () => {
          await flashcardApi.deleteDeck(modal.deck.id); setModal(null); refresh()
          toast({ title: 'Đã xóa bộ thẻ.', tone: 'success' })
        }} />}
      {modal?.kind === 'delete-card' && <ConfirmDialog title={`Xóa thẻ “${modal.card.front}”?`}
        description="Thẻ sẽ bị gỡ khỏi mọi bộ thẻ và lịch ôn." confirmLabel="Xóa thẻ"
        onClose={() => setModal(null)} onConfirm={async () => {
          await flashcardApi.deleteCard(modal.card.id); setModal(null); refresh()
          toast({ title: 'Đã xóa thẻ.', tone: 'success' })
        }} />}
    </div>
  )
}

function EmptyDecks({ onCreate, filtered }: { onCreate: () => void; filtered: boolean }) {
  if (filtered) return <p className="flashcards-empty">Không có chủ đề phù hợp.</p>
  return (
    <div className="flashcards-empty">
      <Layers aria-hidden="true" size={28} />
      <p>Chưa có bộ thẻ. Tạo một bộ cho từng chủ đề IELTS như Environment hay Technology.</p>
      <Button onClick={onCreate}><Plus />Tạo bộ thẻ đầu tiên</Button>
    </div>
  )
}
