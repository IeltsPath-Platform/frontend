import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookMarked, BookOpen, Layers, LogIn } from 'lucide-react'
import {
  notebookApi,
  type NotebookSummaryResponse,
} from '../api/notebookApi'
import { flashcardApi } from '@/features/flashcards/api/flashcardApi'
import { NotebookHero } from '../components/NotebookHero'
import { NotebookWordsPanel } from '../components/NotebookWordsPanel'
import { FlashcardDecksPanel } from '../components/FlashcardDecksPanel'
import { FlashcardCardsPanel } from '../components/FlashcardCardsPanel'
import { OwlHero } from '@/components/OwlHero'
import { useAuthSession } from '@/features/auth/authSession'
import { VocabularyShell } from '../components/VocabularyShell'
import '../vocabulary-notebook.css'
import '../notebook.css'
import '@/features/flashcards/flashcards.css'

export type NotebookTab = 'words' | 'decks' | 'cards'

export function VocabularyNotebookPage() {
  const session = useAuthSession()
  const [searchParams, setSearchParams] = useSearchParams()

  const rawTab = searchParams.get('tab')
  const activeTab: NotebookTab =
    rawTab === 'decks' ? 'decks' : rawTab === 'cards' ? 'cards' : 'words'

  const handleTabChange = (nextTab: NotebookTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (nextTab === 'words') {
          next.delete('tab')
        } else {
          next.set('tab', nextTab)
        }
        return next
      },
      { replace: true },
    )
  }

  // Summary and due cards count
  const [summary, setSummary] = useState<NotebookSummaryResponse | null>(null)
  const [isSummaryLoading, setIsSummaryLoading] = useState(Boolean(session.isLoggedIn))
  const [dueTotal, setDueTotal] = useState<number | null>(null)
  const [deckTotal, setDeckTotal] = useState<number | null>(null)
  const [cardTotal, setCardTotal] = useState<number | null>(null)

  const refreshHeroStats = useCallback(() => {
    if (!session.isLoggedIn) return

    notebookApi
      .getNotebookSummary('Asia/Ho_Chi_Minh')
      .then((data) => {
        setSummary(data)
        setIsSummaryLoading(false)
      })
      .catch(() => {
        setIsSummaryLoading(false)
      })

    flashcardApi
      .dueCards(undefined, 1)
      .then((page) => {
        setDueTotal(page.total)
      })
      .catch(() => {
        setDueTotal(null)
      })

    flashcardApi
      .listDecks(0, 1)
      .then((page) => {
        setDeckTotal(page.total)
      })
      .catch(() => {})

    flashcardApi
      .listCards(0, 1)
      .then((page) => {
        setCardTotal(page.total)
      })
      .catch(() => {})
  }, [session.isLoggedIn])

  useEffect(() => {
    if (session.isLoggedIn) {
      refreshHeroStats()
    }
  }, [session.isLoggedIn, refreshHeroStats])

  return (
    <VocabularyShell skipLabel="Chuyển đến sổ tay">
      <div className="vocab-container nb-page">
        {session.isLoggedIn && (
          <NotebookHero summary={summary} loading={isSummaryLoading} dueTotal={dueTotal} />
        )}

        <div role="tablist" aria-label="Phần sổ tay và flashcard" className="nb-main-tabs">
          <button
            type="button"
            role="tab"
            id="nb-tab-words"
            aria-controls="nb-panel-words"
            aria-selected={activeTab === 'words'}
            className={`nb-main-tab${activeTab === 'words' ? ' is-active' : ''}`}
            onClick={() => handleTabChange('words')}
          >
            <BookMarked size={16} aria-hidden="true" />
            <span>Từ vựng {session.isLoggedIn && summary?.total !== undefined ? `(${summary.total})` : ''}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="nb-tab-decks"
            aria-controls="nb-panel-decks"
            aria-selected={activeTab === 'decks'}
            className={`nb-main-tab${activeTab === 'decks' ? ' is-active' : ''}`}
            onClick={() => handleTabChange('decks')}
          >
            <Layers size={16} aria-hidden="true" />
            <span>Bộ thẻ {session.isLoggedIn && deckTotal !== null ? `(${deckTotal})` : ''}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="nb-tab-cards"
            aria-controls="nb-panel-cards"
            aria-selected={activeTab === 'cards'}
            className={`nb-main-tab${activeTab === 'cards' ? ' is-active' : ''}`}
            onClick={() => handleTabChange('cards')}
          >
            <BookOpen size={16} aria-hidden="true" />
            <span>Tất cả thẻ {session.isLoggedIn && cardTotal !== null ? `(${cardTotal})` : ''}</span>
          </button>
        </div>

        {session.isLoggedIn ? (
          <>
            {activeTab === 'words' && (
              <div id="nb-panel-words" role="tabpanel" aria-labelledby="nb-tab-words">
                <NotebookWordsPanel summary={summary} onChanged={refreshHeroStats} />
              </div>
            )}
            {activeTab === 'decks' && (
              <div id="nb-panel-decks" role="tabpanel" aria-labelledby="nb-tab-decks">
                <FlashcardDecksPanel onChanged={refreshHeroStats} />
              </div>
            )}
            {activeTab === 'cards' && (
              <div id="nb-panel-cards" role="tabpanel" aria-labelledby="nb-tab-cards">
                <FlashcardCardsPanel onChanged={refreshHeroStats} />
              </div>
            )}
          </>
        ) : (
          <>
            {activeTab === 'words' && <GuestNotebook hydrated={session.hydrated} />}
            {activeTab === 'decks' && <GuestDecksOrCards tab="decks" hydrated={session.hydrated} />}
            {activeTab === 'cards' && <GuestDecksOrCards tab="cards" hydrated={session.hydrated} />}
          </>
        )}
      </div>
    </VocabularyShell>
  )
}

function GuestNotebook({ hydrated }: { hydrated: boolean }) {
  if (!hydrated) {
    return (
      <div
        className="vocab-container"
        role="status"
        aria-label="Đang kiểm tra phiên đăng nhập"
        style={{ minHeight: '40vh' }}
      />
    )
  }
  return (
    <div className="vocab-container" style={{ textAlign: 'center', padding: '3rem 1rem 5rem' }}>
      <OwlHero pose="idea" size="lg" alt="" />
      <h1
        style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          margin: '1rem 0 0.5rem',
          color: '#0f172a',
        }}
      >
        Sổ tay từ vựng của bạn
      </h1>
      <p
        style={{
          color: '#64748b',
          margin: '0 auto 1.5rem',
          maxWidth: '34rem',
          lineHeight: 1.6,
        }}
      >
        Lưu từ khi tra từ điển, đặt mức hiểu, ghi chú riêng và ôn đúng lúc theo lịch lặp lại ngắt quãng.
        Đăng nhập để mở sổ tay của riêng bạn.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          to="/login?returnTo=/vocabulary/notebook"
          style={{
            alignItems: 'center',
            background: '#123ab5',
            borderRadius: '0.65rem',
            color: '#ffffff',
            display: 'inline-flex',
            fontWeight: 700,
            gap: '0.4rem',
            padding: '0.7rem 1.4rem',
            textDecoration: 'none',
          }}
        >
          <LogIn size={16} aria-hidden="true" /> Đăng nhập ngay
        </Link>
        <Link
          to="/vocabulary"
          style={{
            alignItems: 'center',
            border: '1px solid #cbd5e1',
            borderRadius: '0.65rem',
            color: '#334155',
            display: 'inline-flex',
            fontWeight: 600,
            padding: '0.7rem 1.4rem',
            textDecoration: 'none',
          }}
        >
          Xem từ điển
        </Link>
      </div>
    </div>
  )
}

function GuestDecksOrCards({ tab, hydrated }: { tab: 'decks' | 'cards'; hydrated: boolean }) {
  if (!hydrated) {
    return (
      <div
        className="vocab-container"
        role="status"
        aria-label="Đang kiểm tra phiên đăng nhập"
        style={{ minHeight: '40vh' }}
      />
    )
  }

  const isDecks = tab === 'decks'
  const title = isDecks ? 'Bộ thẻ Flashcard của bạn' : 'Kho thẻ Flashcard cá nhân'
  const description = isDecks
    ? 'Tạo bộ thẻ theo chủ đề, tự soạn thuật ngữ hoặc nhập trực tiếp từ Từ điển để ôn tập thông minh với thuật toán Leitner. Đăng nhập để bắt đầu tạo bộ thẻ của bạn.'
    : 'Tất cả thẻ từ vựng bạn đã lưu hoặc tự tạo được quản lý tập trung tại đây. Đăng nhập để xem và quản lý các thẻ của bạn.'
  const returnTo = encodeURIComponent(`/vocabulary/notebook?tab=${tab}`)

  return (
    <div className="vocab-container" style={{ textAlign: 'center', padding: '3rem 1rem 5rem' }}>
      <OwlHero pose="laptop" size="lg" alt="" />
      <h1
        style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          margin: '1rem 0 0.5rem',
          color: '#0f172a',
        }}
      >
        {title}
      </h1>
      <p
        style={{
          color: '#64748b',
          margin: '0 auto 1.5rem',
          maxWidth: '34rem',
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          to={`/login?returnTo=${returnTo}`}
          style={{
            alignItems: 'center',
            background: '#123ab5',
            borderRadius: '0.65rem',
            color: '#ffffff',
            display: 'inline-flex',
            fontWeight: 700,
            gap: '0.4rem',
            padding: '0.7rem 1.4rem',
            textDecoration: 'none',
          }}
        >
          <LogIn size={16} aria-hidden="true" /> Đăng nhập ngay
        </Link>
        <Link
          to="/vocabulary"
          style={{
            alignItems: 'center',
            border: '1px solid #cbd5e1',
            borderRadius: '0.65rem',
            color: '#334155',
            display: 'inline-flex',
            fontWeight: 600,
            padding: '0.7rem 1.4rem',
            textDecoration: 'none',
          }}
        >
          Xem từ điển
        </Link>
      </div>
    </div>
  )
}
