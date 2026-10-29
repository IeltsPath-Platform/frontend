import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, BookOpen, BookOpenText, Flame, Layers, PenLine, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OwlHero } from '@/components/OwlHero'
import { SiteNavbar } from '@/components/SiteNavbar'
import { useToast } from '@/components/toast/toastContext'
import { flashcardApi, flashcardErrorMessage, type Flashcard, type FlashcardDeck } from '../api/flashcardApi'
import { CardFormDialog } from '../components/CardFormDialog'
import { CardTile } from '../components/CardTile'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DictionaryImportDialog } from '../components/DictionaryImportDialog'
import '../flashcards.css'

const PAGE_SIZE = 50
type Tab = 'decks' | 'cards'
type Modal =
  | { kind: 'card'; card: Flashcard }
  | { kind: 'delete-deck'; deck: FlashcardDeck }
  | { kind: 'delete-card'; card: Flashcard }
  | { kind: 'import'; tab: 'topic' | 'words' }
  | null

/** Cover gradients for decks without an image, picked from the deck name so a deck keeps its colour. */
const COVERS = [
  'linear-gradient(135deg, #1240d6, #6d8bff)',
  'linear-gradient(135deg, #7c3aed, #c084fc)',
  'linear-gradient(135deg, #ea580c, #fbbf24)',
  'linear-gradient(135deg, #0f766e, #34d399)',
  'linear-gradient(135deg, #be123c, #fb7185)',
  'linear-gradient(135deg, #0369a1, #38bdf8)',
]
const coverFor = (name: string) => COVERS[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % COVERS.length]

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

  const creators = [
    { key: 'manual', icon: PenLine, title: 'Tự soạn thẻ', text: 'Gõ thuật ngữ, định nghĩa, thêm ảnh minh họa.', onClick: () => navigate('/flashcards/decks/new') },
    { key: 'topic', icon: Layers, title: 'Nhập cả chủ đề', text: 'Lấy toàn bộ từ của một chủ đề trong Từ điển.', onClick: () => setModal({ kind: 'import', tab: 'topic' }) },
    { key: 'words', icon: BookOpenText, title: 'Chọn từng từ', text: 'Tra từ điển rồi kéo từng từ vào bộ thẻ.', onClick: () => setModal({ kind: 'import', tab: 'words' }) },
  ]

  return (
    <div className="flashcards-page">
      <SiteNavbar />
      <main className="flashcards-shell">
        <header className="fc-hero">
          <div className="fc-hero__copy">
            <p>IELTS SPACE FLASHCARDS</p>
            <h1>Flashcard của tôi</h1>
            <span>Tạo bộ thẻ thủ công hoặc kéo từ thẳng từ Từ điển, rồi ôn lại đúng lúc sắp quên.</span>
            <div className="fc-hero__stats">
              <strong><Layers aria-hidden="true" size={18} />{decks?.length ?? '–'}<small>bộ thẻ</small></strong>
              <strong><BookOpen aria-hidden="true" size={18} />{cardTotal}<small>thẻ</small></strong>
              <strong className={dueTotal ? 'is-due' : undefined}><Flame aria-hidden="true" size={18} />{dueTotal ?? 0}<small>đến hạn</small></strong>
            </div>
            <Button className="fc-hero__study" disabled={!dueTotal} onClick={() => navigate('/flashcards/study')}>
              {dueTotal ? <>Ôn {dueTotal} thẻ đến hạn<ArrowRight /></> : 'Chưa có thẻ đến hạn'}
            </Button>
          </div>
          <div className="fc-hero__owl" aria-hidden="true">
            <OwlHero poses={['laptop', 'idea', 'cheer']} size="md" />
          </div>
        </header>

        <section className="fc-creators" aria-label="Tạo bộ thẻ mới">
          {creators.map(({ key, icon: Icon, title, text, onClick }, index) => (
            <button key={key} type="button" className={`fc-creator is-${key}`} onClick={onClick} style={{ animationDelay: `${index * 80}ms` }}>
              <span className="fc-creator__icon"><Icon size={22} aria-hidden="true" /></span>
              <strong>{title}</strong>
              <small>{text}</small>
              <ArrowRight className="fc-creator__arrow" size={18} aria-hidden="true" />
            </button>
          ))}
        </section>

        <div className="flashcards-toolbar">
          <div role="tablist" aria-label="Chế độ xem" className="flashcards-tabs">
            <button role="tab" aria-selected={tab === 'decks'} onClick={() => setParams({})}>Bộ thẻ ({decks?.length ?? 0})</button>
            <button role="tab" aria-selected={tab === 'cards'} onClick={() => setParams({ tab: 'cards' })}>Tất cả thẻ ({cardTotal})</button>
          </div>
          <label className="flashcards-search"><Search aria-hidden="true" size={16} />
            <Input value={query} placeholder={tab === 'decks' ? 'Tìm bộ thẻ' : 'Tìm trong thẻ đã tải'} onChange={(event) => setQuery(event.target.value)} />
          </label>
          {/* Cards are always created in rows through the deck editor; the dialog only edits one existing card. */}
          <Button onClick={() => navigate('/flashcards/decks/new')}><Plus />Tạo học phần</Button>
        </div>
        {error && <p role="alert" className="flashcard-error">{error}</p>}

        {tab === 'decks' ? (
          visibleDecks === null || visibleDecks === undefined ? <p className="flashcards-empty">Đang tải bộ thẻ…</p>
            : visibleDecks.length === 0 ? <EmptyDecks onCreate={() => navigate('/flashcards/decks/new')} onImport={() => setModal({ kind: 'import', tab: 'topic' })} filtered={Boolean(keyword)} />
              : <ul className="fc-deck-grid">{visibleDecks.map((deck, index) => (
                <li key={deck.id} className="fc-deck" style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}>
                  <Link to={`/flashcards/decks/${deck.id}`} className="fc-deck__link">
                    <div className="fc-deck__cover" style={deck.coverImageUrl ? undefined : { background: coverFor(deck.name) }}>
                      {deck.coverImageUrl ? <img src={deck.coverImageUrl} alt="" loading="lazy" /> : <span>{deck.name.slice(0, 1).toUpperCase()}</span>}
                      <i className="fc-deck__sheet fc-deck__sheet--a" aria-hidden="true" />
                      <i className="fc-deck__sheet fc-deck__sheet--b" aria-hidden="true" />
                    </div>
                    <div className="fc-deck__body">
                      <h2>{deck.name}</h2>
                      {deck.description && <p>{deck.description}</p>}
                      <div className="fc-deck__meta">
                        {deck.cardCount !== undefined && <span>{deck.cardCount} thẻ</span>}
                        {deck.dueCount ? <span className="is-due"><Flame size={12} aria-hidden="true" />{deck.dueCount} đến hạn</span> : null}
                      </div>
                    </div>
                  </Link>
                  <div className="fc-deck__actions">
                    <Button variant="ghost" size="icon-sm" aria-label={`Sửa ${deck.name}`} onClick={() => navigate(`/flashcards/decks/${deck.id}/edit`)}><Pencil /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Xóa ${deck.name}`} onClick={() => setModal({ kind: 'delete-deck', deck })}><Trash2 /></Button>
                  </div>
                </li>))}</ul>
        ) : (
          <>
            {visibleCards.length === 0 ? <p className="flashcards-empty">{keyword ? 'Không có thẻ phù hợp.' : 'Chưa có thẻ nào. Nhấn “Tạo học phần” hoặc nhập từ Từ điển.'}</p>
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

      {modal?.kind === 'import' && <DictionaryImportDialog initialTab={modal.tab} onClose={() => setModal(null)} onImported={(deckId, added, failed) => {
        setModal(null); refresh()
        toast({ title: `Đã thêm ${added} thẻ từ Từ điển`, description: failed ? `${failed} từ chưa thêm được.` : undefined, tone: failed ? 'info' : 'success' })
        navigate(`/flashcards/decks/${deckId}`)
      }} />}
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

function EmptyDecks({ onCreate, onImport, filtered }: { onCreate: () => void; onImport: () => void; filtered: boolean }) {
  if (filtered) return <p className="flashcards-empty">Không có bộ thẻ phù hợp.</p>
  return (
    <div className="flashcards-empty">
      <OwlHero pose="idea" size="xs" decor={false} />
      <p>Chưa có bộ thẻ. Tạo một bộ cho từng chủ đề IELTS như Environment hay Technology, hoặc nhập sẵn từ Từ điển.</p>
      <div className="fc-empty-actions">
        <Button onClick={onImport}><Layers />Nhập từ Từ điển</Button>
        <Button variant="outline" onClick={onCreate}><Plus />Tự tạo bộ thẻ</Button>
      </div>
    </div>
  )
}
