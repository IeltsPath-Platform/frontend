import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/toast/toastContext'
import {
  flashcardApi,
  flashcardErrorMessage,
  type Flashcard,
  type FlashcardDeck,
} from '@/features/flashcards/api/flashcardApi'
import { CardFormDialog } from '@/features/flashcards/components/CardFormDialog'
import { CardTile } from '@/features/flashcards/components/CardTile'
import { ConfirmDialog } from '@/features/flashcards/components/ConfirmDialog'

const PAGE_SIZE = 50

type SourceFilter = 'ALL' | 'VOCABULARY_SENSE' | 'MANUAL'

type CardModal =
  | { kind: 'card'; card: Flashcard }
  | { kind: 'delete-card'; card: Flashcard }
  | null

interface FlashcardCardsPanelProps {
  onChanged?: () => void
}

export function FlashcardCardsPanel({ onChanged }: FlashcardCardsPanelProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [cards, setCards] = useState<Flashcard[]>([])
  const [cardTotal, setCardTotal] = useState(0)
  const [cardPage, setCardPage] = useState(0)
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL')
  const [error, setError] = useState('')
  const [modal, setModal] = useState<CardModal>(null)
  const [reload, setReload] = useState(0)

  const refresh = () => {
    setReload((v) => v + 1)
    onChanged?.()
  }

  useEffect(() => {
    let live = true
    const fail = (reason: unknown) => {
      if (live) setError(flashcardErrorMessage(reason))
    }
    flashcardApi.listCards(0, PAGE_SIZE).then((page) => {
      if (live) {
        setCards(page.items)
        setCardTotal(page.total)
        setCardPage(0)
      }
    }, fail)
    flashcardApi.listDecks(0, 50).then(
      (page) => {
        if (live) setDecks(page.items)
      },
      () => {},
    )
    return () => {
      live = false
    }
  }, [reload])

  async function loadMoreCards() {
    try {
      const page = await flashcardApi.listCards(cardPage + 1, PAGE_SIZE)
      setCards((current) => [...current, ...page.items])
      setCardTotal(page.total)
      setCardPage(page.page)
    } catch (reason) {
      setError(flashcardErrorMessage(reason))
    }
  }

  const keyword = query.trim().toLowerCase()
  const filteredCards = cards.filter((card) => {
    if (sourceFilter === 'VOCABULARY_SENSE' && card.sourceType !== 'VOCABULARY_SENSE') {
      return false
    }
    if (sourceFilter === 'MANUAL' && card.sourceType === 'VOCABULARY_SENSE') {
      return false
    }
    if (keyword) {
      const matchText = `${card.front} ${card.back}`.toLowerCase()
      if (!matchText.includes(keyword)) return false
    }
    return true
  })

  return (
    <div className="flashcards-panel-cards">
      <div className="flashcards-toolbar">
        <div
          className="fc-source-filter"
          role="group"
          aria-label="Lọc nguồn thẻ"
        >
          <button
            type="button"
            aria-pressed={sourceFilter === 'ALL'}
            onClick={() => setSourceFilter('ALL')}
          >
            Tất cả
          </button>
          <button
            type="button"
            aria-pressed={sourceFilter === 'VOCABULARY_SENSE'}
            onClick={() => setSourceFilter('VOCABULARY_SENSE')}
          >
            Từ điển
          </button>
          <button
            type="button"
            aria-pressed={sourceFilter === 'MANUAL'}
            onClick={() => setSourceFilter('MANUAL')}
          >
            Tự soạn
          </button>
        </div>

        <label className="flashcards-search">
          <Search aria-hidden="true" size={16} />
          <Input
            value={query}
            placeholder="Tìm trong thẻ đã tải"
            data-page-search=""
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <Button onClick={() => navigate('/flashcards/decks/new')}>
          <Plus />
          Tạo học phần
        </Button>
      </div>

      {error && (
        <p role="alert" className="flashcard-error">
          {error}
        </p>
      )}

      {filteredCards.length === 0 ? (
        <p className="flashcards-empty">
          {keyword || sourceFilter !== 'ALL'
            ? 'Không có thẻ phù hợp với bộ lọc.'
            : 'Chưa có thẻ nào. Nhấn “Tạo học phần” hoặc nhập từ Từ điển.'}
        </p>
      ) : (
        <ul className="flashcards-card-grid">
          {filteredCards.map((card) => {
            const isDict = card.sourceType === 'VOCABULARY_SENSE'
            return (
              <li key={card.id}>
                <CardTile
                  front={card.front}
                  back={card.back}
                  imageUrl={card.imageUrl}
                  example={card.exampleSentence}
                  meta={
                    <div className="fc-card-tile-badges">
                      <span className="flashcard-tile-meta">Hộp {card.leitnerBox}/5</span>
                      <span
                        className={`fc-source-badge ${
                          isDict ? 'fc-source-badge--dict' : 'fc-source-badge--manual'
                        }`}
                      >
                        {isDict ? 'Từ điển' : 'Tự soạn'}
                      </span>
                    </div>
                  }
                  actions={
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Sửa ${card.front}`}
                        onClick={() => setModal({ kind: 'card', card })}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Xóa ${card.front}`}
                        onClick={() => setModal({ kind: 'delete-card', card })}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  }
                />
              </li>
            )
          })}
        </ul>
      )}

      {cards.length < cardTotal && (
        <Button
          variant="outline"
          className="flashcards-more"
          onClick={() => void loadMoreCards()}
        >
          Tải thêm thẻ
        </Button>
      )}

      {modal?.kind === 'card' && (
        <CardFormDialog
          card={modal.card}
          decks={decks}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            refresh()
            toast({ title: 'Đã cập nhật thẻ.', tone: 'success' })
          }}
        />
      )}

      {modal?.kind === 'delete-card' && (
        <ConfirmDialog
          title={`Xóa thẻ “${modal.card.front}”?`}
          description="Thẻ sẽ bị gỡ khỏi mọi bộ thẻ và lịch ôn."
          confirmLabel="Xóa thẻ"
          onClose={() => setModal(null)}
          onConfirm={async () => {
            await flashcardApi.deleteCard(modal.card.id)
            setModal(null)
            refresh()
            toast({ title: 'Đã xóa thẻ.', tone: 'success' })
          }}
        />
      )}
    </div>
  )
}
