import { VocabularyShell } from '../components/VocabularyShell'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Volume2,
  Bookmark,
  BookmarkCheck,
  ArrowLeft,
  Sparkles,
  BookOpen,
  ListTree,
  Scale,
  AlertTriangle,
  Quote,
  Check,
  ExternalLink,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'
import { notebookApi, type VocabularyItemDetail, type NotebookEntryResponse } from '../api/notebookApi'
import {
  ALL_LEVELS,
  UNDERSTANDING_LEVELS,
  type UnderstandingLevel,
} from '../lib/understanding'
import { useAuthSession } from '@/features/auth/authSession'
import { speak } from '@/features/flashcards/lib/speak'
import '../vocabulary-notebook.css'

type TabKey = 'definitions' | 'collocations' | 'thesaurus' | 'commonMistakes' | 'examples'

function WordDetailContent() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const session = useAuthSession()
  const isLoggedIn = !!session?.isLoggedIn

  const [item, setItem] = useState<VocabularyItemDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabKey>('definitions')

  // Saved state for logged in user
  const [isSaved, setIsSaved] = useState(false)
  const [savedEntry, setSavedEntry] = useState<NotebookEntryResponse | null>(null)
  const [isSavingWord, setIsSavingWord] = useState(false)

  // Level state
  const [currentLevel, setCurrentLevel] = useState<UnderstandingLevel | null>(null)
  const [isUpdatingLevel, setIsUpdatingLevel] = useState(false)

  // Note state
  const [noteBody, setNoteBody] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false)
  const noteDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id) return
    let ignore = false
    const controller = new AbortController()

    notebookApi
      .getVocabularyItem(id, controller.signal)
      .then(async (data) => {
        if (ignore) return
        setItem(data)
        setError(null)

        if (isLoggedIn && data.senses && data.senses.length > 0) {
          const senseIds = data.senses.map((s) => s.id)
          const savedIds = await notebookApi.getSavedNotebookSenses(senseIds, controller.signal).catch(() => [])
          if (ignore) return
          const saved = savedIds.length > 0
          setIsSaved(saved)

          if (saved) {
            try {
              const entriesRes = await notebookApi.getNotebookEntries({ q: data.lemma, size: 10 }, controller.signal)
              if (ignore) return
              const match = entriesRes.items.find(
                (e) => e.vocabularyItemId === id || senseIds.includes(e.vocabularySenseId)
              )
              if (match) {
                setSavedEntry(match)
                setCurrentLevel(match.level)
                setNoteBody(match.note ?? '')
              }
            } catch {
              // Non-critical
            }
          }
        }
        setIsLoading(false)
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Không thể tải thông tin từ vựng.')
          setIsLoading(false)
        }
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [id, isLoggedIn])

  // Play audio UK / US with fallback
  const handlePlayAudio = (type: 'uk' | 'us' | 'default') => {
    if (!item) return
    let audioUrl: string | null | undefined = null
    if (type === 'uk') audioUrl = item.audioUk || item.pronunciationAudioReference
    else if (type === 'us') audioUrl = item.audioUs || item.pronunciationAudioReference
    else audioUrl = item.pronunciationAudioReference

    if (audioUrl && audioUrl.startsWith('https://')) {
      const audio = new Audio(audioUrl)
      audio.play().catch(() => speak(item.lemma))
    } else {
      speak(item.lemma)
    }
  }

  // Handle Save / Bookmark toggle
  const handleSaveToggle = async () => {
    if (!item || !item.senses || item.senses.length === 0) return

    if (!isLoggedIn) {
      sessionStorage.setItem('pendingSaveSenseId', item.senses[0].id)
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`)
      return
    }

    const firstSense = item.senses[0]
    setIsSavingWord(true)
    try {
      const entry = await notebookApi.saveNotebookEntry(firstSense.id)
      setIsSaved(true)
      setSavedEntry(entry)
      setCurrentLevel(entry.level)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lưu vào sổ tay thất bại.')
    } finally {
      setIsSavingWord(false)
    }
  }

  // Optimistic level update
  const handleLevelSelect = async (level: UnderstandingLevel) => {
    if (!isLoggedIn || !item || !item.senses || item.senses.length === 0 || isUpdatingLevel) return
    const prevLevel = currentLevel

    // If not saved yet, save first
    let flashcardId = savedEntry?.flashcardId
    setIsUpdatingLevel(true)
    setCurrentLevel(level) // Optimistic update

    try {
      if (!flashcardId) {
        const firstSense = item.senses[0]
        const entry = await notebookApi.saveNotebookEntry(firstSense.id)
        setIsSaved(true)
        setSavedEntry(entry)
        flashcardId = entry.flashcardId
      }
      await notebookApi.setNotebookEntryLevel(flashcardId, level)
    } catch {
      // Rollback on error
      setCurrentLevel(prevLevel)
      alert('Không thể cập nhật mức độ hiểu. Vui lòng thử lại.')
    } finally {
      setIsUpdatingLevel(false)
    }
  }

  // Note autosave (debounce 800ms)
  const handleNoteChange = (text: string) => {
    const trimmed = text.slice(0, 300)
    setNoteBody(trimmed)
    setNoteSavedFeedback(false)

    if (noteDebounceTimer.current) {
      clearTimeout(noteDebounceTimer.current)
    }

    if (!item?.senses?.[0]?.id) return

    noteDebounceTimer.current = setTimeout(async () => {
      setIsSavingNote(true)
      try {
        await notebookApi.saveSenseNote(item.senses[0].id, trimmed)
        setNoteSavedFeedback(true)
        setTimeout(() => setNoteSavedFeedback(false), 2500)
      } catch {
        // Silent fail
      } finally {
        setIsSavingNote(false)
      }
    }, 800)
  }

  // Navigation handlers
  const handleStudyNow = async () => {
    if (!isLoggedIn) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`)
      return
    }
    if (!isSaved && item?.senses?.[0]?.id) {
      try {
        await notebookApi.saveNotebookEntry(item.senses[0].id)
      } catch {
        // Continue anyway
      }
    }
    navigate('/vocabulary/notebook/review')
  }

  const handleReviewLater = () => {
    navigate('/vocabulary/notebook')
  }

  if (isLoading) {
    return (
      <div className="vocab-container" style={{ padding: '3rem 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          <div style={{ height: '3.5rem', background: '#f1f5f9', borderRadius: '0.75rem', width: '40%' }} />
          <div style={{ height: '14rem', background: '#f8fafc', borderRadius: '1rem' }} />
          <div style={{ height: '20rem', background: '#f8fafc', borderRadius: '1rem' }} />
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="vocab-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#1e293b' }}>
          {error ?? 'Không tìm thấy từ vựng này'}
        </h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          Từ vựng bạn tìm kiếm có thể đã bị xóa hoặc đường dẫn không chính xác.
        </p>
        <Link
          to="/vocabulary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--classroom-primary, #123ab5)',
            color: 'white',
            fontWeight: 600,
            padding: '0.65rem 1.25rem',
            borderRadius: '0.75rem',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Quay lại Từ điển
        </Link>
      </div>
    )
  }

  // Resolve counts for tabs
  const definitionsCount = item.counts?.definitions ?? item.definitions?.length ?? item.senses.length
  const collocationsCount = item.counts?.collocations ?? item.collocations?.length ?? 0
  const thesaurusCount = item.counts?.thesaurus ?? item.thesaurus?.length ?? 0
  const commonMistakesCount = item.counts?.commonMistakes ?? item.commonMistakes?.length ?? 0
  const examplesCount = item.counts?.examples ?? item.examples?.length ?? 0

  const firstSense = item.senses[0]

  return (
    <div className="vocab-container">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Trang chủ</Link>
        <ChevronRight size={14} />
        <Link to="/vocabulary" style={{ color: 'inherit', textDecoration: 'none' }}>Từ điển</Link>
        <ChevronRight size={14} />
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.lemma}</span>
      </nav>

      {/* Main Grid: Detail + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 340px)', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column: Word Info & Tabs */}
        <div>
          {/* Header Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--classroom-border, #e3e7ef)',
              borderRadius: '1.25rem',
              padding: '1.75rem 2rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                    {item.lemma}
                  </h1>
                  {firstSense?.partOfSpeech && (
                    <span style={{ fontStyle: 'italic', color: '#64748b', fontSize: '1.1rem', fontWeight: 500 }}>
                      ({firstSense.partOfSpeech})
                    </span>
                  )}
                  {item.cefrLevel && (
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '0.5rem',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      {item.cefrLevel}
                    </span>
                  )}
                </div>

                {/* Phonetics & Audio Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  {item.phoneticUk ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '0.1rem 0.35rem', borderRadius: '0.3rem' }}>
                        UK
                      </span>
                      <span style={{ fontFamily: 'monospace', color: '#334155', fontSize: '0.95rem' }}>{item.phoneticUk}</span>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio('uk')}
                        aria-label="Nghe phát âm Anh-Anh"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e40af', padding: '0.25rem', display: 'flex' }}
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                  ) : null}

                  {item.phoneticUs ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '0.1rem 0.35rem', borderRadius: '0.3rem' }}>
                        US
                      </span>
                      <span style={{ fontFamily: 'monospace', color: '#334155', fontSize: '0.95rem' }}>{item.phoneticUs}</span>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio('us')}
                        aria-label="Nghe phát âm Anh-Mỹ"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e40af', padding: '0.25rem', display: 'flex' }}
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                  ) : item.ipa ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontFamily: 'monospace', color: '#334155', fontSize: '0.95rem' }}>{item.ipa}</span>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio('default')}
                        aria-label="Nghe phát âm"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e40af', padding: '0.25rem', display: 'flex' }}
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Bookmark Save Button */}
              <button
                type="button"
                onClick={handleSaveToggle}
                disabled={isSavingWord}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: isSaved ? '1px solid #16a34a' : '1px solid var(--classroom-primary, #123ab5)',
                  background: isSaved ? '#f0fdf4' : 'var(--classroom-primary, #123ab5)',
                  color: isSaved ? '#15803d' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                {isSaved ? 'Đã lưu vào sổ tay' : 'Lưu vào sổ tay'}
              </button>
            </div>

            {/* Quick Meaning Banner */}
            {firstSense && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1e293b', margin: '0 0 0.35rem' }}>
                  {firstSense.vietnameseMeaning ?? firstSense.englishDefinition}
                </p>
                {firstSense.exampleSentence && (
                  <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.925rem', margin: 0 }}>
                    "{firstSense.exampleSentence}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              borderBottom: '2px solid #e2e8f0',
              marginBottom: '1.5rem',
              overflowX: 'auto',
              paddingBottom: '2px',
            }}
          >
            {[
              { key: 'definitions' as TabKey, label: 'Định nghĩa', icon: BookOpen, count: definitionsCount },
              { key: 'collocations' as TabKey, label: 'Collocations', icon: ListTree, count: collocationsCount },
              { key: 'thesaurus' as TabKey, label: 'Từ đồng / Trái nghĩa', icon: Scale, count: thesaurusCount },
              { key: 'commonMistakes' as TabKey, label: 'Lỗi thường gặp', icon: AlertTriangle, count: commonMistakesCount },
              { key: 'examples' as TabKey, label: 'Ví dụ', icon: Quote, count: examplesCount },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    background: 'none',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--classroom-primary, #123ab5)' : '#64748b',
                    borderBottom: isActive ? '3px solid var(--classroom-primary, #123ab5)' : '3px solid transparent',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    marginBottom: '-2px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '999px',
                      background: isActive ? '#dbeafe' : '#f1f5f9',
                      color: isActive ? '#1e40af' : '#64748b',
                      fontWeight: 700,
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Tab Content Panels */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--classroom-border, #e3e7ef)',
              borderRadius: '1.25rem',
              padding: '1.75rem 2rem',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
            }}
          >
            {/* 1. Definitions Tab */}
            {activeTab === 'definitions' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem' }}>
                  Định nghĩa & Ngữ nghĩa
                </h3>
                {item.senses && item.senses.length > 0 ? (
                  <div style={{ display: 'grid', gap: '1.25rem' }}>
                    {item.senses.map((sense, idx) => (
                      <div
                        key={sense.id || idx}
                        style={{
                          padding: '1.15rem 1.25rem',
                          background: '#f8fafc',
                          borderRadius: '0.85rem',
                          border: '1px solid #edf2f7',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <span
                            style={{
                              width: '1.5rem',
                              height: '1.5rem',
                              borderRadius: '50%',
                              background: 'var(--classroom-primary, #123ab5)',
                              color: 'white',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                            {sense.vietnameseMeaning ?? sense.englishDefinition}
                          </span>
                        </div>

                        {sense.englishDefinition && sense.vietnameseMeaning && (
                          <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0.35rem 0 0.5rem', paddingLeft: '2rem' }}>
                            {sense.englishDefinition}
                          </p>
                        )}

                        {sense.exampleSentence && (
                          <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.875rem', margin: '0.5rem 0 0', paddingLeft: '2rem' }}>
                            "{sense.exampleSentence}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b' }}>Chưa có thông tin định nghĩa chi tiết.</p>
                )}
              </div>
            )}

            {/* 2. Collocations Tab */}
            {activeTab === 'collocations' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem' }}>
                  Collocations thường gặp
                </h3>
                {item.collocations && item.collocations.length > 0 ? (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {item.collocations.map((col, idx) => (
                      <div
                        key={col.id || idx}
                        style={{
                          padding: '1rem 1.25rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.75rem',
                          background: '#ffffff',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {col.relatedItemId ? (
                            <Link
                              to={`/vocabulary/${col.relatedItemId}`}
                              style={{
                                fontWeight: 700,
                                color: 'var(--classroom-primary, #123ab5)',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              {col.phrase} <ExternalLink size={13} />
                            </Link>
                          ) : (
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{col.phrase}</span>
                          )}
                          {col.meaning && <span style={{ color: '#475569', fontSize: '0.9rem' }}>— {col.meaning}</span>}
                        </div>
                        {col.example && (
                          <p style={{ margin: '0.4rem 0 0', fontStyle: 'italic', color: '#64748b', fontSize: '0.85rem' }}>
                            "{col.example}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b' }}>Chưa có dữ liệu collocation cho từ này.</p>
                )}
              </div>
            )}

            {/* 3. Thesaurus Tab */}
            {activeTab === 'thesaurus' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem' }}>
                  Từ đồng nghĩa & Trái nghĩa
                </h3>
                {item.thesaurus && item.thesaurus.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {item.thesaurus.map((th, idx) => {
                      const isSyn = th.relation === 'SYNONYM'
                      return (
                        <div
                          key={th.id || idx}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.65rem',
                            border: isSyn ? '1px solid #bbf7d0' : '1px solid #fecaca',
                            background: isSyn ? '#f0fdf4' : '#fef2f2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <span
                              style={{
                                display: 'block',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                color: isSyn ? '#15803d' : '#b91c1c',
                              }}
                            >
                              {isSyn ? 'Đồng nghĩa' : 'Trái nghĩa'}
                            </span>
                            {th.relatedItemId ? (
                              <Link
                                to={`/vocabulary/${th.relatedItemId}`}
                                style={{
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  textDecoration: 'none',
                                  fontSize: '0.95rem',
                                }}
                              >
                                {th.word}
                              </Link>
                            ) : (
                              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{th.word}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#64748b' }}>Chưa có từ đồng nghĩa / trái nghĩa.</p>
                )}
              </div>
            )}

            {/* 4. Common Mistakes Tab */}
            {activeTab === 'commonMistakes' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem' }}>
                  Lỗi thường gặp & Cách tránh
                </h3>
                {item.commonMistakes && item.commonMistakes.length > 0 ? (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {item.commonMistakes.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        style={{
                          padding: '1.15rem 1.25rem',
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          borderRadius: '0.85rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#be123c', fontWeight: 700 }}>
                          <span style={{ textDecoration: 'line-through' }}>✗ {m.mistake}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontWeight: 700, marginTop: '0.35rem' }}>
                          <span>✓ {m.correction}</span>
                        </div>
                        {m.explanation && (
                          <p style={{ margin: '0.5rem 0 0', color: '#475569', fontSize: '0.875rem' }}>
                            {m.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b' }}>Không có lỗi ngữ pháp đặc thù cần lưu ý.</p>
                )}
              </div>
            )}

            {/* 5. Examples Tab */}
            {activeTab === 'examples' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem' }}>
                  Câu ví dụ & Ngữ cảnh
                </h3>
                {item.examples && item.examples.length > 0 ? (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {item.examples.map((ex, idx) => (
                      <div
                        key={ex.id || idx}
                        style={{
                          padding: '1rem 1.25rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', margin: 0, fontStyle: 'italic' }}>
                            "{ex.sentence}"
                          </p>
                          {ex.audio && (
                            <button
                              type="button"
                              onClick={() => {
                                const a = new Audio(ex.audio)
                                a.play().catch(() => speak(ex.sentence))
                              }}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e40af' }}
                            >
                              <Volume2 size={16} />
                            </button>
                          )}
                        </div>
                        {ex.translation && (
                          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.4rem 0 0' }}>
                            {ex.translation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b' }}>Chưa có ví dụ bổ sung.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Info & Sidebar */}
        <aside style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Image Thumbnail */}
          {item.imageUrl && (
            <div
              style={{
                borderRadius: '1.25rem',
                overflow: 'hidden',
                border: '1px solid var(--classroom-border, #e3e7ef)',
                background: '#ffffff',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
              }}
            >
              <img
                src={item.imageUrl}
                alt={item.lemma}
                style={{ width: '100%', height: '180px', objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Quick Info Box (Omit row if null) */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--classroom-border, #e3e7ef)',
              borderRadius: '1.25rem',
              padding: '1.5rem',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', margin: '0 0 1rem' }}>
              Thông tin nhanh
            </h3>
            <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
              {item.frequencyRank != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Frequency (COCA)</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>#{item.frequencyRank}</span>
                </div>
              )}
              {item.cefrLevel != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>CEFR Level</span>
                  <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{item.cefrLevel}</span>
                </div>
              )}
              {item.academicWordList != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Academic Word List</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.academicWordList ? 'Có' : 'Không'}</span>
                </div>
              )}
              {item.topic != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Chủ đề</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.topic}</span>
                </div>
              )}
            </div>
          </div>

          {/* Logged in Personal Box: Understanding Level & Notes */}
          {isLoggedIn ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid var(--classroom-border, #e3e7ef)',
                borderRadius: '1.25rem',
                padding: '1.5rem',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
              }}
            >
              {/* Level Segmented Selector */}
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', margin: '0 0 0.75rem' }}>
                Mức độ hiểu
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {ALL_LEVELS.map((lvl) => {
                  const info = UNDERSTANDING_LEVELS[lvl]
                  const isSelected = currentLevel === lvl
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleLevelSelect(lvl)}
                      disabled={isUpdatingLevel}
                      style={{
                        padding: '0.55rem 0.75rem',
                        borderRadius: '0.65rem',
                        border: isSelected ? `2px solid ${info.color}` : '1px solid #e2e8f0',
                        background: isSelected ? info.bgColor : '#ffffff',
                        color: isSelected ? info.color : '#475569',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected && <Check size={14} />}
                      {info.label}
                    </button>
                  )
                })}
              </div>

              {/* Personal Notes (Autosave ≤300) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', margin: 0 }}>
                  Ghi chú của tôi
                </h4>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {noteSavedFeedback ? 'Đã lưu ✓' : isSavingNote ? 'Đang lưu...' : `${noteBody.length}/300`}
                </span>
              </div>
              <textarea
                value={noteBody}
                onChange={(e) => handleNoteChange(e.target.value)}
                maxLength={300}
                placeholder="Thêm mẹo nhớ, ví dụ cá nhân hoặc lưu ý..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '0.65rem',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '1.25rem',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <Sparkles size={24} style={{ color: 'var(--classroom-warning, #ff7624)', margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem' }}>
                Đăng nhập để học
              </h4>
              <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 1rem' }}>
                Lưu từ vào sổ tay cá nhân, ghi nhớ mức độ thuộc và đặt lịch ôn thông minh.
              </p>
              <Link
                to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
                style={{
                  display: 'block',
                  background: 'var(--classroom-primary, #123ab5)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                  borderRadius: '0.65rem',
                  textDecoration: 'none',
                }}
              >
                Đăng nhập ngay
              </Link>
            </div>
          )}

          {/* Action CTAs */}
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleStudyNow}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                borderRadius: '0.85rem',
                background: 'var(--classroom-warning, #ff7624)',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(255, 118, 36, 0.3)',
              }}
            >
              <Sparkles size={18} /> Lưu và học từ này
            </button>
            <button
              type="button"
              onClick={handleReviewLater}
              style={{
                width: '100%',
                padding: '0.75rem 1.25rem',
                borderRadius: '0.85rem',
                background: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <RotateCcw size={16} /> Mở Sổ tay từ vựng
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

/** Same frame as the rest of the vocabulary area, so the site navbar stays available on every screen. */
export function WordDetailPage() {
  return (
    <VocabularyShell>
      <WordDetailContent />
    </VocabularyShell>
  )
}
