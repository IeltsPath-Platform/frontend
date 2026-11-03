import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpenText, Layers, PenLine, Pencil, Plus, Search, Trash2, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OwlHero } from '@/components/OwlHero'
import { useToast } from '@/components/toast/toastContext'
import {
  flashcardApi,
  flashcardErrorMessage,
  type FlashcardDeck,
} from '@/features/flashcards/api/flashcardApi'
import { ConfirmDialog } from '@/features/flashcards/components/ConfirmDialog'
import { DictionaryImportDialog } from '@/features/flashcards/components/DictionaryImportDialog'

const PAGE_SIZE = 50

const COVERS = [
  'linear-gradient(135deg, #1240d6, #6d8bff)',
  'linear-gradient(135deg, #7c3aed, #c084fc)',
  'linear-gradient(135deg, #ea580c, #fbbf24)',
  'linear-gradient(135deg, #0f766e, #34d399)',
  'linear-gradient(135deg, #be123c, #fb7185)',
  'linear-gradient(135deg, #0369a1, #38bdf8)',
]

const coverFor = (name: string) =>
  COVERS[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % COVERS.length]

type DeckModal =
  | { kind: 'delete-deck'; deck: FlashcardDeck }
  | { kind: 'import'; tab: 'topic' | 'words' }
  | null

interface FlashcardDecksPanelProps {
  onChanged?: () => void
}

export function FlashcardDecksPanel({ onChanged }: FlashcardDecksPanelProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [decks, setDecks] = useState<FlashcardDeck[] | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [modal, setModal] = useState<DeckModal>(null)
  const [reload, setReload] = useState(0)

  const refresh = () => {
    setReload((v) => v + 1)
    onChanged?.()
  }

  useEffect(() => {
    let live = true
    flashcardApi.listDecks(0, PAGE_SIZE).then(
      (page) => {
        if (live) setDecks(page.items)
      },
      (reason) => {
        if (live) {
          setError(flashcardErrorMessage(reason))
          setDecks([])
        }
      },
    )
    return () => {
      live = false
    }
  }, [reload])

  const keyword = query.trim().toLowerCase()
  const visibleDecks = keyword ? decks?.filter((deck) => deck.name.toLowerCase().includes(keyword)) : decks

  const creators = [
    {
      key: 'manual',
      icon: PenLine,
      title: 'Tự soạn thẻ',
      text: 'Gõ thuật ngữ, định nghĩa, thêm ảnh minh họa.',
      onClick: () => navigate('/flashcards/decks/new'),
    },
    {
      key: 'topic',
      icon: Layers,
      title: 'Nhập cả chủ đề',
      text: 'Lấy toàn bộ từ của một chủ đề trong Từ điển.',
      onClick: () => setModal({ kind: 'import', tab: 'topic' }),
    },
    {
      key: 'words',
      icon: BookOpenText,
      title: 'Chọn từng từ',
      text: 'Tra từ điển rồi kéo từng từ vào bộ thẻ.',
      onClick: () => setModal({ kind: 'import', tab: 'words' }),
    },
  ]

  return (
    <div className="flashcards-panel-decks">
      <section className="fc-creators" aria-label="Tạo bộ thẻ mới">
        {creators.map(({ key, icon: Icon, title, text, onClick }, index) => (
          <button
            key={key}
            type="button"
            className={`fc-creator is-${key}`}
            onClick={onClick}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <span className="fc-creator__icon">
              <Icon size={22} aria-hidden="true" />
            </span>
            <strong>{title}</strong>
            <small>{text}</small>
            <ArrowRight className="fc-creator__arrow" size={18} aria-hidden="true" />
          </button>
        ))}
      </section>

      <div className="flashcards-toolbar">
        <label className="flashcards-search">
          <Search aria-hidden="true" size={16} />
          <Input
            value={query}
            placeholder="Tìm bộ thẻ"
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

      {visibleDecks === null || visibleDecks === undefined ? (
        <p className="flashcards-empty">Đang tải bộ thẻ…</p>
      ) : visibleDecks.length === 0 ? (
        <EmptyDecks
          onCreate={() => navigate('/flashcards/decks/new')}
          onImport={() => setModal({ kind: 'import', tab: 'topic' })}
          filtered={Boolean(keyword)}
        />
      ) : (
        <ul className="fc-deck-grid">
          {visibleDecks.map((deck, index) => (
            <li
              key={deck.id}
              className="fc-deck"
              style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
            >
              <Link to={`/flashcards/decks/${deck.id}`} className="fc-deck__link">
                <div
                  className="fc-deck__cover"
                  style={deck.coverImageUrl ? undefined : { background: coverFor(deck.name) }}
                >
                  {deck.coverImageUrl ? (
                    <img src={deck.coverImageUrl} alt="" loading="lazy" />
                  ) : (
                    <span>{deck.name.slice(0, 1).toUpperCase()}</span>
                  )}
                  <i className="fc-deck__sheet fc-deck__sheet--a" aria-hidden="true" />
                  <i className="fc-deck__sheet fc-deck__sheet--b" aria-hidden="true" />
                </div>
                <div className="fc-deck__body">
                  <h2>{deck.name}</h2>
                  {deck.description && <p>{deck.description}</p>}
                  <div className="fc-deck__meta">
                    {deck.cardCount !== undefined && <span>{deck.cardCount} thẻ</span>}
                    {deck.dueCount ? (
                      <span className="is-due">
                        <Flame size={12} aria-hidden="true" />
                        {deck.dueCount} đến hạn
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
              <div className="fc-deck__actions">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Sửa ${deck.name}`}
                  onClick={() => navigate(`/flashcards/decks/${deck.id}/edit`)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Xóa ${deck.name}`}
                  onClick={() => setModal({ kind: 'delete-deck', deck })}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal?.kind === 'import' && (
        <DictionaryImportDialog
          initialTab={modal.tab}
          onClose={() => setModal(null)}
          onImported={(deckId, added, failed) => {
            setModal(null)
            refresh()
            toast({
              title: `Đã thêm ${added} thẻ từ Từ điển`,
              description: failed ? `${failed} từ chưa thêm được.` : undefined,
              tone: failed ? 'info' : 'success',
            })
            navigate(`/flashcards/decks/${deckId}`)
          }}
        />
      )}

      {modal?.kind === 'delete-deck' && (
        <ConfirmDialog
          title={`Xóa bộ thẻ “${modal.deck.name}”?`}
          description="Chỉ xóa bộ thẻ. Các thẻ bên trong vẫn còn trong “Tất cả thẻ”."
          confirmLabel="Xóa bộ thẻ"
          onClose={() => setModal(null)}
          onConfirm={async () => {
            await flashcardApi.deleteDeck(modal.deck.id)
            setModal(null)
            refresh()
            toast({ title: 'Đã xóa bộ thẻ.', tone: 'success' })
          }}
        />
      )}
    </div>
  )
}

function EmptyDecks({
  onCreate,
  onImport,
  filtered,
}: {
  onCreate: () => void
  onImport: () => void
  filtered: boolean
}) {
  if (filtered) return <p className="flashcards-empty">Không có bộ thẻ phù hợp.</p>
  return (
    <div className="flashcards-empty">
      <OwlHero pose="idea" size="xs" decor={false} />
      <p>
        Chưa có bộ thẻ. Tạo một bộ cho từng chủ đề IELTS như Environment hay Technology, hoặc nhập
        sẵn từ Từ điển.
      </p>
      <div className="fc-empty-actions">
        <Button onClick={onImport}>
          <Layers />
          Nhập từ Từ điển
        </Button>
        <Button variant="outline" onClick={onCreate}>
          <Plus />
          Tự tạo bộ thẻ
        </Button>
      </div>
    </div>
  )
}
