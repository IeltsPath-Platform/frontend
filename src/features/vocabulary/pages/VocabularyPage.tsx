import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  BookMarked,
  Volume2,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ExternalLink,
  History,
  X,
  Lock,
} from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { useAuthSession } from '@/features/auth/authSession'
import { useToast } from '@/components/toast/toastContext'
import {
  notebookApi,
  type VocabularyCatalogItem,
  type VocabularyCatalogSense,
  type NotebookSummaryResponse,
  type LearningReportResponse,
  type TopicsProgressResponse,
  type VocabularyMapResponse,
  type WeeklyGoalResponse,
} from '../api/notebookApi'
import { CurrentLevelCard } from '../components/CurrentLevelCard'
import { CurrentTopicCard } from '../components/CurrentTopicCard'
import { WeeklyGoalCard } from '../components/WeeklyGoalCard'
import { VocabularyMapCard } from '../components/VocabularyMapCard'
import { ExploreSetsTabs } from '../components/ExploreSetsTabs'
import { speak } from '@/features/flashcards/lib/speak'
import '../vocabulary.css'
import '../vocabulary-notebook.css'

const SEARCH_HISTORY_KEY = 'ieltspath_vocab_search_history'

function getStoredHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(term: string) {
  if (!term.trim()) return
  try {
    const current = getStoredHistory().filter((item) => item.toLowerCase() !== term.toLowerCase())
    const next = [term.trim(), ...current].slice(0, 5)
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
  } catch {
    // ignore local storage error
  }
}

export function VocabularyPage() {
  const session = useAuthSession()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [lang, setLang] = useState<'EN_VI' | 'VI_EN'>('EN_VI')
  const [history, setHistory] = useState<string[]>(() => getStoredHistory())

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Array<{ id: string; lemma: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Catalog items
  const [items, setItems] = useState<VocabularyCatalogItem[]>([])
  const [savedSenseIds, setSavedSenseIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingSenseId, setSavingSenseId] = useState<string | null>(null)

  // Learner personal data
  const [summary, setSummary] = useState<NotebookSummaryResponse | null>(null)
  const [learningReport, setLearningReport] = useState<LearningReportResponse | null>(null)
  const [topicsProgress, setTopicsProgress] = useState<TopicsProgressResponse | null>(null)
  const [mapData, setMapData] = useState<VocabularyMapResponse | null>(null)
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoalResponse | null>(null)

  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Auto-save pending sense after login
  useEffect(() => {
    if (session.isLoggedIn) {
      try {
        const pendingSenseId = sessionStorage.getItem('pendingSaveSenseId')
        if (pendingSenseId) {
          sessionStorage.removeItem('pendingSaveSenseId')
          notebookApi
            .saveNotebookEntry(pendingSenseId)
            .then(() => {
              setSavedSenseIds((prev) => new Set([...prev, pendingSenseId]))
              toast({
                title: 'Đã lưu từ vào Sổ tay!',
                description: 'Từ vựng đã được thêm vào sổ tay cá nhân của bạn.',
                tone: 'success',
              })
            })
            .catch(() => {})
        }
      } catch {
        // ignore
      }
    }
  }, [session.isLoggedIn, toast])

  // Load learner dashboard data when logged in
  useEffect(() => {
    if (!session.isLoggedIn) {
      return
    }

    const controller = new AbortController()

    notebookApi
      .getNotebookSummary('Asia/Ho_Chi_Minh', controller.signal)
      .then((data) => setSummary(data))
      .catch(() => {})

    notebookApi
      .getLearningReport(controller.signal)
      .then((rep) => setLearningReport(rep))
      .catch(() => {})

    notebookApi
      .getTopicsProgress(undefined, controller.signal)
      .then((tp) => setTopicsProgress(tp))
      .catch(() => {})

    notebookApi
      .getVocabularyMap(undefined, controller.signal)
      .then((m) => setMapData(m))
      .catch(() => {})

    notebookApi
      .getWeeklyGoal('Asia/Ho_Chi_Minh', controller.signal)
      .then((wg) => setWeeklyGoal(wg))
      .catch(() => {})

    return () => controller.abort()
  }, [session.isLoggedIn])

  // Debounce search query 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim())
      if (searchQuery.trim()) {
        saveHistory(searchQuery.trim())
        setHistory(getStoredHistory())
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Prefix suggestions when typing
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed || trimmed.length < 2) {
      return
    }

    const controller = new AbortController()
    notebookApi
      .getSuggestions(trimmed, controller.signal)
      .then((data) => {
        setSuggestions(data || [])
        setShowSuggestions(true)
      })
      .catch(() => {
        setSuggestions([])
      })

    return () => controller.abort()
  }, [searchQuery])

  // Fetch catalog items
  useEffect(() => {
    const controller = new AbortController()

    notebookApi
      .getCatalogVocabulary({ q: debouncedQuery, page: 0, size: 20 }, controller.signal)
      .then((data) => {
        setItems(data.items ?? [])
        setTotal(data.total ?? 0)
        setError(null)
        setPage(0)

        // If user is logged in, check which senses are saved
        if (session.isLoggedIn && data.items && data.items.length > 0) {
          const allSenseIds = data.items.flatMap((item) => item.senses.map((s) => s.id))
          notebookApi
            .getSavedNotebookSenses(allSenseIds, controller.signal)
            .then((saved) => setSavedSenseIds(new Set(saved)))
            .catch(() => {})
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError('Không tải được danh sách từ vựng. Vui lòng thử lại.')
        }
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [debouncedQuery, session.isLoggedIn])

  // Load more pages
  const handleLoadMore = async () => {
    if (loadingMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const data = await notebookApi.getCatalogVocabulary({
        q: debouncedQuery,
        page: nextPage,
        size: 20,
      })
      setItems((prev) => [...prev, ...(data.items ?? [])])
      setPage(nextPage)

      if (session.isLoggedIn && data.items && data.items.length > 0) {
        const newSenseIds = data.items.flatMap((item) => item.senses.map((s) => s.id))
        const saved = await notebookApi.getSavedNotebookSenses(newSenseIds)
        setSavedSenseIds((prev) => new Set([...prev, ...saved]))
      }
    } catch {
      toast({
        title: 'Lỗi tải thêm',
        description: 'Không thể tải thêm từ vựng, vui lòng thử lại.',
        tone: 'error',
      })
    } finally {
      setLoadingMore(false)
    }
  }

  // Handle bookmark / save
  const handleSaveSense = async (sense: VocabularyCatalogSense, lemma: string) => {
    if (!session.isLoggedIn) {
      try {
        sessionStorage.setItem('pendingSaveSenseId', sense.id)
      } catch {
        // ignore
      }
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    setSavingSenseId(sense.id)
    try {
      await notebookApi.saveNotebookEntry(sense.id)
      setSavedSenseIds((prev) => new Set([...prev, sense.id]))
      toast({
        title: `Đã lưu từ "${lemma}" vào sổ tay`,
        description: sense.vietnameseMeaning || sense.englishDefinition || undefined,
        tone: 'success',
      })
    } catch {
      toast({
        title: 'Không thể lưu từ',
        description: 'Vui lòng thử lại sau.',
        tone: 'error',
      })
    } finally {
      setSavingSenseId(null)
    }
  }

  const handleAudio = (lemma: string, audioRef?: string | null) => {
    if (audioRef && audioRef.startsWith('https://')) {
      new Audio(audioRef).play().catch(() => speak(lemma))
    } else {
      speak(lemma)
    }
  }

  return (
    <div className="dictionary-page">
      <a className="skip-link" href="#dictionary-content">
        Chuyển đến nội dung chính
      </a>
      <SiteNavbar />

      <main id="dictionary-content" tabIndex={-1} className="vocab-container" style={{ paddingBottom: '5rem' }}>
        {/* Dictionary Hero Section */}
        <div className="vocab-hero" role="region" aria-label="Từ điển học theo chủ đề" style={{ marginBottom: '2rem' }}>
          <div className="vocab-hero__grid">
            <div>
              <p style={{ color: '#d1dcfa', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>
                IELTS SPACE DICTIONARY
              </p>
              <h1 className="vocab-hero__title">Từ điển học theo chủ đề</h1>
              <p className="vocab-hero__subtitle">
                Tra cứu từ vựng học thuật chuẩn Cambridge, nghe phát âm IPA UK/US và lưu trực tiếp vào Sổ tay để ôn ngắt quãng.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <BookOpen size={18} aria-hidden="true" />
                  {total > 0 ? `${total} từ trong kho` : 'Kho từ vựng học thuật'}
                </span>

                {session.isLoggedIn ? (
                  <Link
                    to="/vocabulary/notebook"
                    style={{
                      color: '#ffffff',
                      textDecoration: 'underline',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                    }}
                  >
                    Xem Sổ tay từ vựng của tôi →
                  </Link>
                ) : (
                  <Link
                    to="/login?returnTo=/vocabulary"
                    style={{
                      color: '#ffd29d',
                      textDecoration: 'underline',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                    }}
                  >
                    Đăng nhập để lưu từ và theo dõi tiến độ →
                  </Link>
                )}
              </div>
            </div>

            <div>
              <Link to="/vocabulary/notebook" className="vocab-hero__cta" aria-label="Đến Sổ tay từ vựng">
                <BookMarked size={20} aria-hidden="true" />
                Sổ tay từ vựng
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        {/* Learner Personal Dashboard Area */}
        {session.isLoggedIn ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginBottom: '2.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'stretch' }}>
              <CurrentLevelCard summary={summary} report={learningReport} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <CurrentTopicCard currentTopic={topicsProgress?.current ?? null} />
                <WeeklyGoalCard initialGoal={weeklyGoal} onGoalUpdated={(up) => setWeeklyGoal(up)} />
              </div>
            </div>

            <VocabularyMapCard mapData={mapData} />
          </div>
        ) : (
          <div
            style={{
              background: '#f8faff',
              border: '1px dashed #bfdbfe',
              borderRadius: '1.25rem',
              padding: '1.5rem 2rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1d4ed8',
                }}
              >
                <Lock size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Đăng nhập để mở khóa tiến độ học cá nhân
                </h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.825rem', color: '#64748b' }}>
                  Theo dõi trình độ CEFR, mục tiêu tuần và bản đồ từ vựng 6 cấp độ của bạn.
                </p>
              </div>
            </div>

            <Link
              to="/login?returnTo=/vocabulary"
              style={{
                background: '#123ab5',
                color: '#ffffff',
                padding: '0.6rem 1.25rem',
                borderRadius: '0.65rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {/* Explore Vocabulary Sets Section (4 Tabs) */}
        <div style={{ marginBottom: '2.5rem' }}>
          <ExploreSetsTabs />
        </div>

        {/* Search Toolbar */}
        <div
          ref={searchContainerRef}
          style={{
            background: '#ffffff',
            border: '1px solid var(--classroom-border, #e3e7ef)',
            borderRadius: '1rem',
            padding: '1rem 1.25rem',
            marginBottom: '2rem',
            boxShadow: 'var(--classroom-shadow, 0 4px 12px rgb(0 0 0 / 4%))',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setLang('EN_VI')}
                style={{
                  border: 'none',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: lang === 'EN_VI' ? '#ffffff' : 'transparent',
                  color: lang === 'EN_VI' ? 'var(--classroom-primary, #123ab5)' : '#64748b',
                  boxShadow: lang === 'EN_VI' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Anh – Việt
              </button>
              <button
                type="button"
                onClick={() => setLang('VI_EN')}
                style={{
                  border: 'none',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: lang === 'VI_EN' ? '#ffffff' : 'transparent',
                  color: lang === 'VI_EN' ? 'var(--classroom-primary, #123ab5)' : '#64748b',
                  boxShadow: lang === 'VI_EN' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Việt – Anh
              </button>
            </div>

            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search
                size={18}
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value
                  setSearchQuery(val)
                  if (!val.trim() || val.trim().length < 2) {
                    setSuggestions([])
                    setShowSuggestions(false)
                  }
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true)
                }}
                placeholder="Tìm từ, nghĩa hoặc chủ đề..."
                className="vocab-search-input"
                aria-label="Tìm từ, nghĩa hoặc chủ đề"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSuggestions([])
                    setShowSuggestions(false)
                  }}
                  style={{
                    position: 'absolute',
                    right: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '0.35rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.75rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 50,
                    overflow: 'hidden',
                  }}
                >
                  {suggestions.slice(0, 8).map((sug) => (
                    <div
                      key={sug.id}
                      onClick={() => {
                        setShowSuggestions(false)
                        navigate(`/vocabulary/${sug.id}`)
                      }}
                      style={{
                        padding: '0.65rem 1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <span>{sug.lemma}</span>
                      <ExternalLink size={14} style={{ color: '#94a3b8' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search History Chips */}
          {history.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <History size={14} aria-hidden="true" /> Gần đây:
              </span>
              {history.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSearchQuery(term)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '999px',
                    padding: '0.15rem 0.6rem',
                    fontSize: '0.78rem',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="vocab-grid" role="status" aria-label="Đang tải danh sách từ vựng">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="vocab-card"
                style={{ minHeight: '180px', opacity: 0.6, background: '#f8fafc', animation: 'pulse 1.5s infinite ease-in-out' }}
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '1rem',
              color: '#991b1b',
            }}
            role="alert"
          >
            <p style={{ fontWeight: 700, margin: '0 0 1rem', fontSize: '1rem' }}>{error}</p>
            <button
              type="button"
              onClick={() => setDebouncedQuery(searchQuery.trim())}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: '0.5rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Thử lại
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div
            style={{
              padding: '4rem 1.5rem',
              textAlign: 'center',
              background: '#ffffff',
              border: '1px dashed var(--classroom-border, #e3e7ef)',
              borderRadius: '1.25rem',
            }}
            role="status"
          >
            <BookOpen size={48} style={{ color: '#94a3b8', margin: '0 auto 1rem' }} aria-hidden="true" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#1e293b' }}>
              Không tìm thấy từ vựng phù hợp
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              Hãy thử tìm kiếm với từ khóa khác hoặc chuyển chế độ từ điển Anh–Việt.
            </p>
            {debouncedQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'var(--classroom-primary, #123ab5)',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Xóa tìm kiếm
              </button>
            )}
          </div>
        )}

        {/* Catalog Items List */}
        {!loading && !error && items.length > 0 && (
          <div>
            <div className="vocab-grid">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="vocab-card"
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                >
                  <div>
                    <div className="vocab-card__top">
                      <div>
                        <Link
                          to={`/vocabulary/${item.id}`}
                          style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          <h3 className="vocab-card__lemma" lang="en">
                            {item.lemma}
                          </h3>
                        </Link>
                        {item.ipa && <p className="vocab-card__ipa-row">{item.ipa}</p>}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAudio(item.lemma, item.pronunciationAudioReference)}
                        aria-label={`Nghe phát âm từ ${item.lemma}`}
                        style={{
                          background: '#eef3ff',
                          border: 'none',
                          borderRadius: '50%',
                          padding: '0.4rem',
                          color: 'var(--classroom-primary, #123ab5)',
                          cursor: 'pointer',
                        }}
                      >
                        <Volume2 size={18} aria-hidden="true" />
                      </button>
                    </div>

                    {/* Senses list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                      {item.senses.map((sense) => {
                        const isSaved = savedSenseIds.has(sense.id)
                        const isSaving = savingSenseId === sense.id

                        return (
                          <div
                            key={sense.id}
                            style={{
                              background: '#f8fafc',
                              padding: '0.75rem',
                              borderRadius: '0.65rem',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                                {sense.vietnameseMeaning || sense.englishDefinition || 'Xem nghĩa trong chi tiết'}
                              </p>

                              <button
                                type="button"
                                onClick={() => handleSaveSense(sense, item.lemma)}
                                disabled={isSaving}
                                aria-label={isSaved ? `Đã lưu từ ${item.lemma}` : `Lưu từ ${item.lemma} vào sổ tay`}
                                title={isSaved ? 'Đã lưu trong sổ tay' : 'Lưu vào sổ tay'}
                                style={{
                                  background: isSaved ? '#fff0df' : '#ffffff',
                                  border: `1px solid ${isSaved ? '#ffb076' : '#cbd5e1'}`,
                                  color: isSaved ? 'var(--classroom-warning, #ff7624)' : '#64748b',
                                  borderRadius: '0.45rem',
                                  padding: '0.35rem 0.55rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {isSaved ? (
                                  <>
                                    <BookmarkCheck size={14} aria-hidden="true" />
                                    Đã lưu
                                  </>
                                ) : (
                                  <>
                                    <Bookmark size={14} aria-hidden="true" />
                                    Lưu
                                  </>
                                )}
                              </button>
                            </div>

                            {sense.exampleSentence && (
                              <p
                                style={{
                                  fontSize: '0.8rem',
                                  color: '#64748b',
                                  fontStyle: 'italic',
                                  margin: '0.4rem 0 0',
                                }}
                                lang="en"
                              >
                                "{sense.exampleSentence}"
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                    <Link
                      to={`/vocabulary/${item.id}`}
                      style={{
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        color: 'var(--classroom-primary, #123ab5)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        textDecoration: 'none',
                      }}
                    >
                      Chi tiết từ <ExternalLink size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {/* Load more button */}
            {items.length < total && (
              <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--classroom-border, #e3e7ef)',
                    padding: '0.75rem 2rem',
                    borderRadius: '0.75rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: 'var(--classroom-primary, #123ab5)',
                    cursor: 'pointer',
                    boxShadow: 'var(--classroom-shadow, 0 4px 12px rgb(0 0 0 / 4%))',
                  }}
                >
                  {loadingMore ? 'Đang tải thêm…' : `Tải thêm từ vựng (${items.length}/${total})`}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
