import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpenCheck, BookOpenText, ClipboardCheck, Layers, Pencil, Repeat, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteNavbar } from '@/components/SiteNavbar'
import { useToast } from '@/components/toast/toastContext'
import { flashcardApi, flashcardErrorMessage, loadAllDeckItems, type DeckItem, type Flashcard, type FlashcardDeck } from '../api/flashcardApi'
import { CardFormDialog } from '../components/CardFormDialog'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DeckBrowser } from '../components/DeckBrowser'
import { DictionaryImportDialog } from '../components/DictionaryImportDialog'
import '../flashcards.css'

type Modal = { kind: 'card'; card: Flashcard } | { kind: 'delete-deck' } | { kind: 'remove'; item: DeckItem } | { kind: 'import' } | null

export function DeckDetailPage() {
  const { deckId = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [deck, setDeck] = useState<FlashcardDeck | null>(null)
  const [items, setItems] = useState<DeckItem[] | null>(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<Modal>(null)
  const [reload, setReload] = useState(0)
  const load = () => setReload((value) => value + 1)

  useEffect(() => {
    let live = true
    Promise.all([flashcardApi.getDeck(deckId), loadAllDeckItems(deckId)]).then(([loadedDeck, loadedItems]) => {
      if (live) { setDeck(loadedDeck); setItems(loadedItems); setError('') }
    }, (reason) => { if (live) { setError(flashcardErrorMessage(reason)); setItems([]) } })
    return () => { live = false }
  }, [deckId, reload])

  async function editCard(item: DeckItem) {
    // Deck items carry only a summary, so the full card is fetched before editing.
    try { setModal({ kind: 'card', card: await flashcardApi.getCard(item.flashcardId) }) }
    catch (reason) { setError(flashcardErrorMessage(reason)) }
  }

  const count = items?.length ?? 0
  const canStudy = count >= 2
  const modes = [
    { key: 'cards', icon: Layers, title: 'Thẻ ghi nhớ', text: 'Lật thẻ, nghe phát âm', href: '#deck-cards', enabled: count > 0 },
    { key: 'learn', icon: BookOpenCheck, title: 'Học', text: 'Trắc nghiệm rồi tự gõ đến khi thuộc', href: `/flashcards/decks/${deckId}/learn`, enabled: canStudy },
    { key: 'test', icon: ClipboardCheck, title: 'Kiểm tra', text: 'Bài kiểm tra có chấm điểm', href: `/flashcards/decks/${deckId}/test`, enabled: canStudy },
    { key: 'review', icon: Repeat, title: 'Ôn ngắt quãng', text: `${deck?.dueCount ?? 0} thẻ đến hạn hôm nay`, href: `/flashcards/study?deckId=${deckId}`, enabled: Boolean(deck?.dueCount) },
  ]

  return (
    <div className="flashcards-page">
      <SiteNavbar />
      <main className="flashcards-shell">
        <Link to="/flashcards" className="flashcards-back"><ArrowLeft size={16} aria-hidden="true" />Tất cả học phần</Link>
        {error && <p role="alert" className="flashcard-error">{error}</p>}
        {deck && (
          <header className="deck-hub-header">
            {deck.coverImageUrl && <img src={deck.coverImageUrl} alt="" />}
            <div>
              <h1>{deck.name}</h1>
              {deck.description && <p>{deck.description}</p>}
              <small>{count} thuật ngữ</small>
            </div>
            <div className="deck-hub-actions">
              <Button onClick={() => setModal({ kind: 'import' })}><BookOpenText />Thêm từ từ điển</Button>
              <Button variant="outline" onClick={() => navigate(`/flashcards/decks/${deck.id}/edit`)}><Pencil />Chỉnh sửa</Button>
              <Button variant="ghost" size="icon" aria-label="Xóa học phần" onClick={() => setModal({ kind: 'delete-deck' })}><Trash2 /></Button>
            </div>
          </header>
        )}

        {deck && (
          <nav className="deck-hub-modes" aria-label="Chế độ học">
            {modes.map(({ key, icon: Icon, title, text, href, enabled }) => (
              enabled
                ? <Link key={key} to={href} className={`deck-hub-mode is-${key}`} onClick={key === 'cards' ? (event) => { event.preventDefault(); document.getElementById('deck-cards')?.scrollIntoView({ behavior: 'smooth' }) } : undefined}>
                    <Icon aria-hidden="true" /><strong>{title}</strong><span>{text}</span>
                  </Link>
                : <span key={key} className={`deck-hub-mode is-${key} is-disabled`} aria-disabled="true">
                    <Icon aria-hidden="true" /><strong>{title}</strong><span>{key === 'review' ? 'Chưa có thẻ đến hạn' : 'Cần ít nhất 2 thẻ'}</span>
                  </span>
            ))}
          </nav>
        )}

        <div id="deck-cards">
          {items === null ? <p className="flashcards-empty">Đang tải thẻ…</p>
            : items.length === 0 ? (
              <div className="flashcards-empty">
                <p>Học phần chưa có thẻ.</p>
                <div className="fc-empty-actions">
                  <Button onClick={() => setModal({ kind: 'import' })}><BookOpenText />Thêm từ từ điển</Button>
                  <Button variant="outline" onClick={() => navigate(`/flashcards/decks/${deckId}/edit`)}><Pencil />Tự soạn thẻ</Button>
                </div>
              </div>
            ) : <DeckBrowser items={items} onEdit={(item) => void editCard(item)} onRemove={(item) => setModal({ kind: 'remove', item })} />}
        </div>
      </main>

      {modal?.kind === 'import' && deck && <DictionaryImportDialog deckId={deck.id} onClose={() => setModal(null)}
        onImported={(_deckId, added, failed) => {
          setModal(null); load()
          toast({ title: `Đã thêm ${added} thẻ vào học phần`, description: failed ? `${failed} từ chưa thêm được.` : undefined, tone: failed ? 'info' : 'success' })
        }} />}
      {modal?.kind === 'card' && deck && <CardFormDialog card={modal.card} decks={[deck]} onClose={() => setModal(null)}
        onSaved={() => { setModal(null); load(); toast({ title: 'Đã cập nhật thẻ.', tone: 'success' }) }} />}
      {modal?.kind === 'delete-deck' && deck && <ConfirmDialog title={`Xóa học phần “${deck.name}”?`}
        description="Chỉ xóa học phần. Các thẻ bên trong vẫn còn trong “Tất cả thẻ”." confirmLabel="Xóa học phần"
        onClose={() => setModal(null)} onConfirm={async () => {
          await flashcardApi.deleteDeck(deck.id); toast({ title: 'Đã xóa học phần.', tone: 'success' }); navigate('/flashcards')
        }} />}
      {modal?.kind === 'remove' && deck && <ConfirmDialog title={`Gỡ “${modal.item.front}” khỏi học phần?`}
        description="Thẻ vẫn còn trong “Tất cả thẻ” và các học phần khác." confirmLabel="Gỡ khỏi học phần"
        onClose={() => setModal(null)} onConfirm={async () => {
          await flashcardApi.removeFromDeck(deck.id, modal.item.flashcardId); setModal(null); load()
        }} />}
    </div>
  )
}
