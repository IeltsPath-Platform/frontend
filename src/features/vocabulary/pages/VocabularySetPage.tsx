import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Award,
  BookOpen,
  Flame,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Clock,
  Volume2,
  Sparkles,
  Trophy,
  RotateCcw,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { useAuthSession } from '@/features/auth/authSession'
import { useToast } from '@/components/toast/toastContext'
import {
  notebookApi,
  type VocabularySetDetail,
  type SetProgressResponse,
  type RecentResultResponse,
  type AchievementItem,
  type VocabularyCatalogItem,
  type VocabularyCatalogSense,
} from '../api/notebookApi'
import { WeeklyGoalCard } from '../components/WeeklyGoalCard'
import { speak } from '@/features/flashcards/lib/speak'
import '../vocabulary.css'
import '../vocabulary-notebook.css'

type SetTab = 'OVERVIEW' | 'TOPICS' | 'WORDS' | 'PROGRESS'

export function VocabularySetPage() {
  const { id = '' } = useParams<{ id: string }>()
  const session = useAuthSession()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<SetTab>('OVERVIEW')
  const [setDetail, setSetDetail] = useState<VocabularySetDetail | null>(null)
  const [progress, setProgress] = useState<SetProgressResponse | null>(null)
  const [recentResult, setRecentResult] = useState<RecentResultResponse | null>(null)
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [words, setWords] = useState<VocabularyCatalogItem[]>([])
  const [savedSenseIds, setSavedSenseIds] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingSet, setSavingSet] = useState(false)
  const [savingSenseId, setSavingSenseId] = useState<string | null>(null)

  // Fetch set detail, progress, recent result, and achievements
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()

    const detailPromise = notebookApi.getSetDetail(id, controller.signal)
    const wordsPromise = notebookApi.getSetWords(id, { size: 50 }, controller.signal)

    const requests: Promise<unknown>[] = [detailPromise, wordsPromise]

    if (session.isLoggedIn) {
      requests.push(
        notebookApi.getSetProgress(id, controller.signal).catch(() => null),
        notebookApi.getRecentResult(controller.signal).catch(() => null),
        notebookApi.getAchievements('Asia/Ho_Chi_Minh', controller.signal).catch(() => ({ items: [] }))
      )
    }

    Promise.all(requests)
      .then(([detailRes, wordsRes, progRes, recentRes, achRes]) => {
        setSetDetail(detailRes as VocabularySetDetail)
        const wordItems = (wordsRes as { items?: VocabularyCatalogItem[] })?.items || []
        setWords(wordItems)
        setError(null)

        if (progRes) setProgress(progRes as SetProgressResponse)
        if (recentRes) setRecentResult(recentRes as RecentResultResponse)
        if (achRes && (achRes as { items?: AchievementItem[] }).items) {
          setAchievements((achRes as { items: AchievementItem[] }).items)
        }

        // Check saved senses for words in set
        if (session.isLoggedIn && wordItems.length > 0) {
          const senseIds = wordItems.flatMap((w) => w.senses.map((s) => s.id))
          notebookApi
            .getSavedNotebookSenses(senseIds, controller.signal)
            .then((saved) => setSavedSenseIds(new Set(saved)))
            .catch(() => {})
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError('Không thể tải thông tin bộ từ vựng. Vui lòng thử lại.')
        }
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [id, session.isLoggedIn])

  // Save whole set into notebook
  const handleSaveWholeSet = async () => {
    if (!session.isLoggedIn) {
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    if (words.length === 0) {
      toast({
        title: 'Bộ từ trống',
        description: 'Bộ từ này hiện chưa có từ vựng nào để lưu.',
        tone: 'error',
      })
      return
    }

    setSavingSet(true)
    try {
      const sensesToSave = words.flatMap((w) => w.senses.map((s) => s.id))
      let savedCount = 0

      // Batch save with chunking
      for (const senseId of sensesToSave) {
        if (!savedSenseIds.has(senseId)) {
          try {
            await notebookApi.saveNotebookEntry(senseId)
            savedCount++
          } catch {
            // continue next
          }
        }
      }

      setSavedSenseIds(new Set([...savedSenseIds, ...sensesToSave]))
      toast({
        title: 'Đã lưu bộ từ vựng!',
        description: `Đã thêm ${savedCount > 0 ? savedCount : 'tất cả'} từ vào Sổ tay của bạn.`,
        tone: 'success',
      })
    } catch {
      toast({
        title: 'Lỗi khi lưu bộ từ',
        description: 'Một số từ chưa được lưu thành công. Vui lòng thử lại.',
        tone: 'error',
      })
    } finally {
      setSavingSet(false)
    }
  }

  // Handle saving individual sense
  const handleSaveSense = async (sense: VocabularyCatalogSense, lemma: string) => {
    if (!session.isLoggedIn) {
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    setSavingSenseId(sense.id)
    try {
      await notebookApi.saveNotebookEntry(sense.id)
      setSavedSenseIds((prev) => new Set([...prev, sense.id]))
      toast({
        title: `Đã lưu từ "${lemma}"`,
        description: sense.vietnameseMeaning || sense.englishDefinition || undefined,
        tone: 'success',
      })
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu từ vào sổ tay.',
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

  if (loading) {
    return (
      <div className="dictionary-page">
        <SiteNavbar />
        <main className="vocab-container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <RotateCcw size={32} className="animate-spin" style={{ color: '#2563eb', margin: '0 auto 1rem' }} />
          <p style={{ color: '#64748b', fontWeight: 600 }}>Đang tải bộ từ vựng…</p>
        </main>
      </div>
    )
  }

  if (error || !setDetail) {
    return (
      <div className="dictionary-page">
        <SiteNavbar />
        <main className="vocab-container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontWeight: 700, marginBottom: '1rem' }}>{error || 'Không tìm thấy bộ từ vựng.'}</p>
          <Link
            to="/vocabulary"
            style={{
              background: '#2563eb',
              color: '#ffffff',
              padding: '0.6rem 1.25rem',
              borderRadius: '0.5rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            ← Quay lại kho từ điển
          </Link>
        </main>
      </div>
    )
  }

  const mastered = progress?.learned ?? 0
  const learning = progress?.learning ?? 0
  const due = progress?.needsReview ?? 0
  const total = progress?.total ?? setDetail.wordCount ?? words.length
  const percent = progress?.percent ?? (total > 0 ? Math.round((mastered / total) * 100) : 0)

  return (
    <div className="dictionary-page">
      <SiteNavbar />

      <main className="vocab-container" style={{ paddingBottom: '5rem' }}>
        {/* Set Hero */}
        <div
          style={{
            background: 'linear-gradient(135deg, #123ab5 0%, #1e40af 100%)',
            borderRadius: '1.25rem',
            color: '#ffffff',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 24px rgba(18, 58, 181, 0.2)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                  }}
                >
                  {setDetail.kind === 'BAND' ? `Band ${setDetail.bandRange || setDetail.cefrLevel || 'All'}` : 'Chủ đề'}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                  {total} từ vựng
                </span>
              </div>

              <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.85rem', fontWeight: 900, color: '#ffffff' }}>
                {setDetail.title}
              </h1>

              {setDetail.description && (
                <p style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', color: '#e2e8f0', maxWidth: '640px', lineHeight: 1.5 }}>
                  {setDetail.description}
                </p>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <Link
                  to={`/vocabulary/sets/${id}/study`}
                  style={{
                    background: '#ff7624',
                    color: '#ffffff',
                    padding: '0.75rem 1.75rem',
                    borderRadius: '0.65rem',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(255, 118, 36, 0.35)',
                  }}
                >
                  <Sparkles size={18} aria-hidden="true" />
                  Tiếp tục lộ trình học
                </Link>

                <button
                  type="button"
                  onClick={handleSaveWholeSet}
                  disabled={savingSet}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.65rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <BookmarkCheck size={18} aria-hidden="true" />
                  {savingSet ? 'Đang lưu cả bộ…' : 'Lưu bộ từ vào sổ tay'}
                </button>
              </div>
            </div>

            {/* Owl / Mascot Illustration */}
            <div
              style={{
                display: 'none',
                minWidth: '120px',
                textAlign: 'center',
              }}
              className="set-owl-container"
            >
              <div
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                }}
              >
                🦉
              </div>
            </div>
          </div>

          {/* 3 Stats Counters on Hero */}
          {session.isLoggedIn && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
                marginTop: '1.75rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.75rem', borderRadius: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#bbf7d0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Award size={14} /> Đã thành thạo
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', display: 'block', marginTop: '0.15rem' }}>
                  {mastered}
                </span>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.75rem', borderRadius: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#bfdbfe', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <BookOpen size={14} /> Đang học
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', display: 'block', marginTop: '0.15rem' }}>
                  {learning}
                </span>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.75rem', borderRadius: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#fed7aa', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Flame size={14} /> Cần ôn lại
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', display: 'block', marginTop: '0.15rem' }}>
                  {due}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2 Column Layout: Main Content + Right Sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: '1.75rem', alignItems: 'start' }}>
          {/* Left Column: 4 Tabs */}
          <div>
            {/* Tabs Header */}
            <div
              role="tablist"
              style={{
                display: 'flex',
                background: '#f1f5f9',
                padding: '0.35rem',
                borderRadius: '0.85rem',
                gap: '0.35rem',
                marginBottom: '1.5rem',
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'OVERVIEW'}
                onClick={() => setActiveTab('OVERVIEW')}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.65rem',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeTab === 'OVERVIEW' ? '#ffffff' : 'transparent',
                  color: activeTab === 'OVERVIEW' ? '#123ab5' : '#64748b',
                  boxShadow: activeTab === 'OVERVIEW' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Tổng quan
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'TOPICS'}
                onClick={() => setActiveTab('TOPICS')}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.65rem',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeTab === 'TOPICS' ? '#ffffff' : 'transparent',
                  color: activeTab === 'TOPICS' ? '#123ab5' : '#64748b',
                  boxShadow: activeTab === 'TOPICS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Chủ đề
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'WORDS'}
                onClick={() => setActiveTab('WORDS')}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.65rem',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeTab === 'WORDS' ? '#ffffff' : 'transparent',
                  color: activeTab === 'WORDS' ? '#123ab5' : '#64748b',
                  boxShadow: activeTab === 'WORDS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Tất cả từ vựng ({words.length})
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'PROGRESS'}
                onClick={() => setActiveTab('PROGRESS')}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.65rem',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeTab === 'PROGRESS' ? '#ffffff' : 'transparent',
                  color: activeTab === 'PROGRESS' ? '#123ab5' : '#64748b',
                  boxShadow: activeTab === 'PROGRESS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Tiến độ
              </button>
            </div>

            {/* Tab 1: Tổng quan */}
            {activeTab === 'OVERVIEW' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Topics in set preview */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '1.25rem',
                    padding: '1.5rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  }}
                >
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Các chủ đề chính trong bộ từ
                  </h3>

                  {setDetail.topicSummaries && setDetail.topicSummaries.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                      {setDetail.topicSummaries.map((top) => (
                        <div
                          key={top.topicId}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.75rem',
                            padding: '0.85rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                            {top.name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: '#e2e8f0',
                              color: '#475569',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                            }}
                          >
                            {top.count} từ
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                      Bộ từ bao gồm các từ vựng tổng quát theo khung band mục tiêu.
                    </p>
                  )}
                </div>

                {/* Words preview sample */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '1.25rem',
                    padding: '1.5rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      Từ vựng nổi bật
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('WORDS')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontWeight: 700,
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                      }}
                    >
                      Xem tất cả {words.length} từ →
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {words.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          background: '#f8fafc',
                          borderRadius: '0.75rem',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button
                            type="button"
                            onClick={() => handleAudio(item.lemma, item.pronunciationAudioReference)}
                            style={{
                              background: '#eef3ff',
                              border: 'none',
                              borderRadius: '50%',
                              padding: '0.4rem',
                              color: '#123ab5',
                              cursor: 'pointer',
                            }}
                            aria-label={`Nghe phát âm từ ${item.lemma}`}
                          >
                            <Volume2 size={16} />
                          </button>
                          <div>
                            <Link
                              to={`/vocabulary/${item.id}`}
                              style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}
                            >
                              {item.lemma}
                            </Link>
                            {item.ipa && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>{item.ipa}</span>}
                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#475569' }}>
                              {item.senses[0]?.vietnameseMeaning || item.senses[0]?.englishDefinition}
                            </p>
                          </div>
                        </div>

                        <Link
                          to={`/vocabulary/${item.id}`}
                          style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
                        >
                          Chi tiết
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Chủ đề */}
            {activeTab === 'TOPICS' && (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Danh sách chủ đề trong bộ
                </h3>

                {setDetail.topicSummaries && setDetail.topicSummaries.length > 0 ? (
                  setDetail.topicSummaries.map((top) => (
                    <div
                      key={top.topicId}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.85rem',
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#f8fafc',
                      }}
                    >
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                          {top.name}
                        </h4>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Số lượng: {top.count} từ vựng
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            background: '#dcfce7',
                            color: '#166534',
                          }}
                        >
                          Sẵn sàng học
                        </span>
                        <Link
                          to={`/vocabulary?topicId=${top.topicId}`}
                          style={{
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            color: '#2563eb',
                            textDecoration: 'none',
                          }}
                        >
                          Xem từ →
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                    Bộ từ này tập hợp trực tiếp các từ vựng mà không phân tách theo chủ đề nhỏ.
                  </p>
                )}
              </div>
            )}

            {/* Tab 3: Tất cả từ vựng */}
            {activeTab === 'WORDS' && (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Danh sách tất cả từ ({words.length} từ)
                  </h3>
                  <button
                    type="button"
                    onClick={handleSaveWholeSet}
                    disabled={savingSet}
                    style={{
                      background: '#eff6ff',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '0.5rem',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Bookmark size={14} />
                    Lưu tất cả
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {words.map((item) => {
                    const firstSense = item.senses[0]
                    const isSaved = firstSense ? savedSenseIds.has(firstSense.id) : false
                    const isSaving = firstSense ? savingSenseId === firstSense.id : false

                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '0.85rem 1.25rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <button
                            type="button"
                            onClick={() => handleAudio(item.lemma, item.pronunciationAudioReference)}
                            style={{
                              background: '#eef3ff',
                              border: 'none',
                              borderRadius: '50%',
                              padding: '0.45rem',
                              color: '#123ab5',
                              cursor: 'pointer',
                            }}
                            aria-label={`Phát âm từ ${item.lemma}`}
                          >
                            <Volume2 size={16} />
                          </button>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Link
                                to={`/vocabulary/${item.id}`}
                                style={{
                                  textDecoration: 'none',
                                  color: '#0f172a',
                                  fontWeight: 800,
                                  fontSize: '1rem',
                                }}
                              >
                                {item.lemma}
                              </Link>
                              {item.ipa && (
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.ipa}</span>
                              )}
                            </div>
                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.825rem', color: '#475569' }}>
                              {firstSense?.vietnameseMeaning || firstSense?.englishDefinition}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {firstSense && (
                            <button
                              type="button"
                              onClick={() => handleSaveSense(firstSense, item.lemma)}
                              disabled={isSaving}
                              style={{
                                background: isSaved ? '#fff0df' : '#ffffff',
                                border: `1px solid ${isSaved ? '#ffb076' : '#cbd5e1'}`,
                                color: isSaved ? '#ff7624' : '#64748b',
                                borderRadius: '0.45rem',
                                padding: '0.35rem 0.6rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                              {isSaved ? 'Đã lưu' : 'Lưu'}
                            </button>
                          )}

                          <Link
                            to={`/vocabulary/${item.id}`}
                            style={{
                              color: '#2563eb',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            Chi tiết <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tab 4: Tiến độ */}
            {activeTab === 'PROGRESS' && (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Tiến độ học tập bộ từ
                </h3>

                {session.isLoggedIn ? (
                  <>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>Hoàn thành tổng thể</span>
                        <span style={{ fontWeight: 800, color: '#2563eb' }}>{percent}%</span>
                      </div>
                      <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${percent}%`,
                            background: '#2563eb',
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #bbf7d0' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>Đã thuộc vững</span>
                        <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900, color: '#15803d', marginTop: '0.25rem' }}>
                          {mastered} từ
                        </span>
                      </div>

                      <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #bfdbfe' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e40af' }}>Đang ghi nhớ</span>
                        <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900, color: '#1d4ed8', marginTop: '0.25rem' }}>
                          {learning} từ
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      Đăng nhập để lưu tiến độ và theo dõi tỷ lệ hoàn thành bộ từ vựng này.
                    </p>
                    <Link
                      to={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
                      style={{
                        background: '#123ab5',
                        color: 'white',
                        padding: '0.6rem 1.25rem',
                        borderRadius: '0.5rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      Đăng nhập ngay
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Weekly Goal Widget */}
            {session.isLoggedIn && <WeeklyGoalCard />}

            {/* Recent Result Widget */}
            {recentResult && (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '1.25rem',
                  padding: '1.25rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Clock size={18} style={{ color: '#2563eb' }} aria-hidden="true" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    Kết quả gần nhất
                  </h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: '#f0fdf4',
                      border: '3px solid #16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1rem',
                      color: '#166534',
                    }}
                  >
                    {recentResult.percent}%
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                      Đúng {recentResult.correct} / {recentResult.total} câu
                    </span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {recentResult.topic ? `Chủ đề: ${recentResult.topic}` : 'Phiên ôn tập'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Suggested Study Method */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '1.25rem',
                padding: '1.25rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <HelpCircle size={18} style={{ color: '#2563eb' }} aria-hidden="true" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Cách học đề xuất
                </h4>
              </div>

              <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#475569', lineHeight: 1.6 }}>
                <li>Đọc nghĩa, nghe phát âm chuẩn UK/US và xem ví dụ.</li>
                <li>Luyện nhớ bằng thẻ Flashcard 3D ngắt quãng.</li>
                <li>Kiểm tra khả năng nhớ từ bằng bài tập gõ từ và nghe chép.</li>
                <li>Đặt câu thực hành để áp dụng ngay vào bài thi IELTS Writing/Speaking.</li>
              </ol>
            </div>

            {/* Achievements Widget */}
            {achievements.length > 0 && (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '1.25rem',
                  padding: '1.25rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Trophy size={18} style={{ color: '#eab308' }} aria-hidden="true" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    Thành tích đạt được
                  </h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {achievements.map((ach) => (
                    <div
                      key={ach.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        background: ach.achieved ? '#fefce8' : '#f8fafc',
                        border: `1px solid ${ach.achieved ? '#fef08a' : '#e2e8f0'}`,
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: ach.achieved ? '#854d0e' : '#64748b' }}>
                        {ach.code === 'STREAK_7'
                          ? 'Chuỗi 7 ngày ôn tập'
                          : ach.code === 'TOPIC_1'
                          ? 'Hoàn thành 1 chủ đề'
                          : ach.code === 'MASTER_300'
                          ? 'Ghi nhớ 300 từ'
                          : ach.code}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: ach.achieved ? '#16a34a' : '#94a3b8' }}>
                        {ach.achieved ? '✓ Đạt' : `${ach.progress}/${ach.target}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky bottom bar: "Sẵn sàng học tiếp?" */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid #e2e8f0',
            padding: '0.85rem 1.5rem',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
            Sẵn sàng học tiếp bộ từ này?
          </span>
          <Link
            to={`/vocabulary/sets/${id}/study`}
            style={{
              background: '#123ab5',
              color: '#ffffff',
              padding: '0.65rem 1.5rem',
              borderRadius: '0.65rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(18, 58, 181, 0.25)',
            }}
          >
            Bắt đầu học ngay
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </main>
    </div>
  )
}
