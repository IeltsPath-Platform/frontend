import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Search } from 'lucide-react'
import { HttpError } from '@/lib/httpClient'
import type { PracticeCard, PracticeMode, SkillType } from '@/types/practice'
import { PracticeNavbar } from '../components/PracticeNavbar'
import { PracticeSidebar } from '../components/PracticeSidebar'
import { PracticeCosmicBanner } from '../components/PracticeCosmicBanner'
import { PracticeTestCard } from '../components/PracticeTestCard'
import { PracticeModeModal } from '../components/PracticeModeModal'
import { WritingModeModal } from '../components/WritingModeModal'
import type { WritingMode } from '../writing/writingApi'
import {
  getPracticeFormats,
  getReadingProgress,
  searchReadingTests,
  startReadingAttempt,
} from '../reading/readingPracticeApi'
import type { PracticeFormatCount, ReadingTestCard } from '../reading/readingPracticeApi'
import { toCatalogKeyFilter } from '../lib/progressKeys'
import { practiceFormatLabel } from '../lib/practiceFormatLabels'
import {
  PRACTICE_SKILL_CONFIG,
  defaultPracticePart,
  parsePracticeSkill,
  partBadge,
  toScopeAndPart,
} from '../lib/practiceSkillConfig'
import type { PracticePart } from '../lib/practiceSkillConfig'
import '../reading/reading-practice.css'

type CatalogTab = 'uncompleted' | 'completed'

const PAGE_SIZE = 9

export interface PracticeCatalogPageProps {
  /** Opens the workspace of a skill that is not wired to attempts yet (everything except Reading). */
  onOpenTest: (skill: SkillType, testId: string, mode: PracticeMode) => void
}

function errorMessage(error: unknown) {
  if (error instanceof HttpError) return error.message
  return 'Không tải được thư viện đề. Vui lòng thử lại.'
}

function formatDuration(seconds: number | null) {
  if (!seconds) return 'Thời gian linh hoạt'
  const minutes = Math.round(seconds / 60)
  return minutes >= 60 ? `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}` : `${minutes} phút`
}

function cardKey(card: ReadingTestCard) {
  return `${card.packageId}:${card.scope === 'FULL' ? 'full' : (card.parts[0]?.partNo ?? 'part')}`
}

export function PracticeCatalogPage({ onOpenTest }: PracticeCatalogPageProps) {
  const [searchParams] = useSearchParams()
  const skill = parsePracticeSkill(searchParams.get('skill'))
  // A new skill starts with its own part, formats and page.
  return <PracticeCatalog key={skill} skill={skill} onOpenTest={onOpenTest} />
}

function PracticeCatalog({ skill, onOpenTest }: PracticeCatalogPageProps & { skill: SkillType }) {
  const navigate = useNavigate()
  const config = PRACTICE_SKILL_CONFIG[skill]
  const [part, setPart] = useState<PracticePart>(defaultPracticePart(config))
  const [tab, setTab] = useState<CatalogTab>('uncompleted')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [formats, setFormats] = useState<PracticeFormatCount[]>([])
  // When the formats endpoint is unavailable the filter falls back to the formats seen on the loaded cards.
  const [formatsUnavailable, setFormatsUnavailable] = useState(false)
  const [seenFormats, setSeenFormats] = useState<string[]>([])
  const [searchParams] = useSearchParams()
  const [selectedFormats, setSelectedFormats] = useState<string[]>(() =>
    (searchParams.get('format') ?? '').split(',').filter((code) => /^[A-Z][A-Z_]{0,39}$/.test(code)).slice(0, 10))
  const [cards, setCards] = useState<ReadingTestCard[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modeCard, setModeCard] = useState<ReadingTestCard | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [reload, setReload] = useState(0)

  const { scope, partNo } = toScopeAndPart(part)
  const formatKey = selectedFormats.join(',')

  useEffect(() => {
    const controller = new AbortController()
    void getPracticeFormats(config.apiSkill, controller.signal)
      .then((result) => { setFormats(result); setFormatsUnavailable(false) })
      .catch(() => {
        if (controller.signal.aborted) return
        setFormats([])
        setFormatsUnavailable(true)
      })
    return () => controller.abort()
  }, [config.apiSkill])

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim().slice(0, 100)), 300)
    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      setLoading(true)
      setError('')
    })
    const requestedScope = scope
    const requestedPart = partNo
    const currentPage = page
    const requestedFormats = formatKey ? formatKey.split(',') : []
    void getReadingProgress(requestedScope, controller.signal, config.apiSkill).then((progress) => {
      const keys = (progress.completed ?? []).map(({ packageId, partNo: donePart }) => ({ packageId, partNo: donePart }))
      const progressFilter = toCatalogKeyFilter(tab, keys)
      if (progressFilter === 'EMPTY') return { totalElements: 0, page: currentPage, size: PAGE_SIZE, items: [] as ReadingTestCard[] }
      return searchReadingTests({
        skill: config.apiSkill,
        scope: requestedScope,
        ...(requestedScope === 'PART' && requestedPart ? { partNo: requestedPart } : {}),
        ...(requestedFormats.length ? { formats: requestedFormats } : {}),
        ...(debouncedQuery ? { query: debouncedQuery } : {}),
        ...progressFilter,
        page: currentPage,
        size: PAGE_SIZE,
      }, controller.signal)
    }).then((result) => {
      if (controller.signal.aborted) return
      setCards(result.items)
      setTotal(result.totalElements)
      setSeenFormats((current) => [...new Set([...current, ...result.items.flatMap((item) => item.formats)])])
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(errorMessage(cause))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [config.apiSkill, scope, partNo, tab, debouncedQuery, formatKey, page, reload])

  const formatOptions = useMemo<PracticeFormatCount[]>(
    () => formatsUnavailable ? seenFormats.map((code) => ({ code, sectionCount: 0 })) : formats,
    [formats, formatsUnavailable, seenFormats],
  )

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  // Without the formats endpoint the backend cannot filter, so the selected formats are applied to the loaded page.
  const visibleCards = useMemo(
    () => formatsUnavailable && selectedFormats.length
      ? cards.filter((card) => card.formats.some((format) => selectedFormats.includes(format)))
      : cards,
    [cards, formatsUnavailable, selectedFormats],
  )

  const practiceCards = useMemo(() => visibleCards.map((card): PracticeCard => ({
    id: cardKey(card),
    title: card.title,
    passageBadge: partBadge(config, card.scope, card.parts[0]?.partNo ?? partNo),
    skill,
    imageUrl: card.coverUrl ?? undefined,
    bulletPoints: [
      ...card.formats.slice(0, 3).map(practiceFormatLabel),
      `${card.questionCount} ${config.unit} · ${formatDuration(card.timeLimitSeconds)}`,
    ],
    questionsCount: card.questionCount,
  })), [visibleCards, config, partNo, skill])

  function selectPart(next: PracticePart) {
    setPart(next)
    setPage(0)
  }

  function toggleFormat(code: string) {
    setSelectedFormats((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])
    setPage(0)
  }

  function openMode(card: PracticeCard) {
    const found = visibleCards.find((item) => cardKey(item) === card.id)
    if (!found) return
    setStartError('')
    setModeCard(found)
  }

  /** A Writing task opens its own workspace: the learner picks free writing or the step-by-step guide. */
  function startWriting(card: ReadingTestCard, mode: WritingMode) {
    const target = card.parts.find((item) => item.partNo === partNo) ?? card.parts[0]
    if (!target) return
    navigate(`/practice/writing/tasks/${card.packageVersionId}/${target.sectionId}?mode=${mode}`)
  }

  function startTest(card: ReadingTestCard, mode: PracticeMode) {
    // Reading and Listening run on real attempts; Writing and Speaking still open their sample workspaces.
    if (skill !== 'reading' && skill !== 'listening') {
      onOpenTest(skill, card.packageId, mode)
      return
    }
    if (starting) return
    setStarting(true)
    setStartError('')
    void startReadingAttempt(card, mode, card.scope === 'PART' ? partNo : undefined).then((attempt) => {
      navigate(`/practice/${skill}/attempts/${attempt.id}?mode=${attempt.mode === 'TIMED' ? 'exam' : 'practice'}`)
    }).catch((reason: unknown) => {
      setStartError(errorMessage(reason))
      setStarting(false)
    })
  }

  return (
    <div className="practice-light-root">
      <PracticeNavbar activeTab="practice" />

      <div className="practice-main-shell">
        <div className="practice-layout-grid">
          <PracticeSidebar
            currentSkill={skill}
            selectedPart={part}
            onSelectPart={selectPart}
            formats={formatOptions}
            selectedFormats={selectedFormats}
            onToggleFormat={toggleFormat}
          />

          <main className="practice-catalog-main">
            <PracticeCosmicBanner onStartTest={() => navigate('/learn/placement')} />

            <div className="practice-controls-row">
              <div className="practice-segmented-tabs" role="tablist" aria-label="Trạng thái bài luyện">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'uncompleted'}
                  className={`tab-pill-btn ${tab === 'uncompleted' ? 'active' : ''}`}
                  onClick={() => { setTab('uncompleted'); setPage(0) }}
                >
                  Bài chưa làm
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'completed'}
                  className={`tab-pill-btn ${tab === 'completed' ? 'active' : ''}`}
                  onClick={() => { setTab('completed'); setPage(0) }}
                >
                  Bài đã làm
                </button>
              </div>

              <div className="practice-pill-search">
                <Search size={16} className="search-pill-icon" aria-hidden="true" />
                <label className="sr-only" htmlFor="practice-search-input">Tìm tên bài tập</label>
                <input
                  id="practice-search-input"
                  type="text"
                  maxLength={100}
                  placeholder="Tìm tên bài tập"
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setPage(0) }}
                  className="search-pill-input"
                />
              </div>
            </div>

            {error && (
              <div className="reading-state reading-error" role="alert">
                <p>{error}</p>
                <button type="button" onClick={() => setReload((current) => current + 1)}>Thử lại</button>
              </div>
            )}

            {loading && (
              <div className="practice-visual-grid" aria-label="Đang tải đề" aria-busy="true">
                {[0, 1, 2].map((item) => <div className="reading-card-skeleton" key={item} />)}
              </div>
            )}

            {!loading && !error && practiceCards.length === 0 && (
              <div className="reading-state reading-empty">
                <BookOpen size={28} aria-hidden="true" />
                <h3>{tab === 'completed' ? 'Bạn chưa làm bài nào ở mục này' : 'Chưa có đề phù hợp'}</h3>
                <p>
                  {tab === 'completed'
                    ? 'Hoàn thành một đề để xem lại tại đây.'
                    : `Thử đổi ${config.partLabel}, dạng bài hoặc từ khóa tìm kiếm.`}
                </p>
              </div>
            )}

            {!loading && !error && practiceCards.length > 0 && (
              <div className="practice-visual-grid">
                {practiceCards.map((view) => (
                  <PracticeTestCard key={view.id} card={view} onClick={openMode} />
                ))}
              </div>
            )}

            {!loading && !error && total > PAGE_SIZE && (
              <nav className="reading-pagination" aria-label="Phân trang đề">
                <button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Trước</button>
                <span>Trang {page + 1} / {pageCount}</span>
                <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>Sau</button>
              </nav>
            )}

            {skill === 'reading' && (
              <p className="reading-history-entry"><Link to="/practice/reading/history">Lịch sử làm bài Reading</Link></p>
            )}
          </main>
        </div>
      </div>

      {modeCard && skill === 'writing' && (
        <WritingModeModal
          key={cardKey(modeCard)}
          title={practiceCards.find((view) => view.id === cardKey(modeCard))?.title ?? modeCard.title}
          onClose={() => setModeCard(null)}
          onConfirm={(mode) => startWriting(modeCard, mode)}
        />
      )}

      {modeCard && skill !== 'writing' && (
        <PracticeModeModal
          key={cardKey(modeCard)}
          isOpen
          card={practiceCards.find((view) => view.id === cardKey(modeCard)) ?? null}
          defaultMode="exam"
          busy={starting}
          error={startError}
          examDisabledReason={modeCard.timeLimitSeconds ? undefined : 'Đề này chưa có giới hạn thời gian nên chưa thể dùng giao diện Thi thật.'}
          onClose={() => setModeCard(null)}
          onConfirmMode={(mode) => startTest(modeCard, mode)}
        />
      )}
    </div>
  )
}
