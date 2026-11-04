import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowRight, BookOpen, Library, RefreshCw, Sparkles } from 'lucide-react'
import {
  notebookApi,
  type NotebookEntryResponse,
  type NotebookSort,
  type NotebookSummaryResponse,
} from '../api/notebookApi'
import { type UnderstandingLevel } from '../lib/understanding'
import { NotebookToolbar } from './NotebookToolbar'
import { QuickAddWord } from './QuickAddWord'
import { WordCard } from './WordCard'
import { WordDetailDialog } from './WordDetailDialog'
import { DictionaryPickList } from './DictionaryPickList'
import { useDictionarySearch } from '../lib/dictionary-search'
import { useNotebookSaver } from '../lib/use-notebook-saver'
import { useToast } from '@/components/toast/toastContext'

const LOCAL_STORAGE_VIEW_MODE_KEY = 'ieltspath_vocab_view_mode'

interface NotebookWordsPanelProps {
  summary: NotebookSummaryResponse | null
  onChanged?: () => void
}

export function NotebookWordsPanel({ summary, onChanged }: NotebookWordsPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  // URL Params State
  const searchQuery = searchParams.get('q') ?? ''
  const dueParam = searchParams.get('due') === 'true'
  const sortParam = (searchParams.get('sort') as NotebookSort) || 'RECENT'
  const levelParams = useMemo(() => {
    const raw = searchParams.getAll('level')
    return raw as UnderstandingLevel[]
  }, [searchParams])

  // Local View Mode with localStorage fallback
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_VIEW_MODE_KEY)
      return saved === 'list' ? 'list' : 'grid'
    } catch {
      return 'grid'
    }
  })

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    try {
      localStorage.setItem(LOCAL_STORAGE_VIEW_MODE_KEY, mode)
    } catch {
      // Ignore
    }
  }

  // Entries State
  const [entries, setEntries] = useState<NotebookEntryResponse[]>([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [page, setPage] = useState(0)
  const [isEntriesLoading, setIsEntriesLoading] = useState(true)
  const [entriesError, setEntriesError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Popup selection
  const [selectedEntry, setSelectedEntry] = useState<NotebookEntryResponse | null>(null)

  // Fetch Entries on pagination
  const fetchEntries = useCallback(
    async (currentPage: number, append = false) => {
      if (append) setIsLoadingMore(true)
      else setIsEntriesLoading(true)
      setEntriesError(null)

      try {
        const res = await notebookApi.getNotebookEntries(
          {
            q: searchQuery,
            level: levelParams.length > 0 ? levelParams : undefined,
            due: dueParam ? true : undefined,
            sort: sortParam,
            page: currentPage,
            size: 24,
          }
        )

        setEntries((prev) => (append ? [...prev, ...res.items] : res.items))
        setTotalEntries(res.total)
        setPage(currentPage)
      } catch (err) {
        setEntriesError(err instanceof Error ? err.message : 'Không thể tải danh sách từ vựng.')
      } finally {
        setIsEntriesLoading(false)
        setIsLoadingMore(false)
      }
    },
    [searchQuery, levelParams, dueParam, sortParam]
  )

  // Initial load & search param changes
  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    notebookApi
      .getNotebookEntries(
        {
          q: searchQuery,
          level: levelParams.length > 0 ? levelParams : undefined,
          due: dueParam ? true : undefined,
          sort: sortParam,
          page: 0,
          size: 24,
        },
        controller.signal
      )
      .then((res) => {
        if (!ignore) {
          setEntries(res.items)
          setTotalEntries(res.total)
          setPage(0)
          setEntriesError(null)
          setIsEntriesLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setEntriesError(err instanceof Error ? err.message : 'Không thể tải danh sách từ vựng.')
          setIsEntriesLoading(false)
        }
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [searchQuery, levelParams, dueParam, sortParam])

  // Filter & Search Param Updaters
  const updateSearchQuery = (q: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (q.trim()) next.set('q', q.trim())
        else next.delete('q')
        return next
      },
      { replace: true }
    )
  }

  const toggleLevelFilter = (lvl: UnderstandingLevel) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        const current = next.getAll('level')
        next.delete('level')
        if (current.includes(lvl)) {
          current.filter((item) => item !== lvl).forEach((item) => next.append('level', item))
        } else {
          ;[...current, lvl].forEach((item) => next.append('level', item))
        }
        return next
      },
      { replace: true }
    )
  }

  const clearLevelFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('level')
        return next
      },
      { replace: true }
    )
  }

  const toggleDueOnly = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (dueParam) next.delete('due')
        else next.set('due', 'true')
        return next
      },
      { replace: true }
    )
  }

  const updateSort = (sort: NotebookSort) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('sort', sort)
        return next
      },
      { replace: true }
    )
  }

  // Drawer Open & Selection
  const handleOpenDetail = (entry: NotebookEntryResponse) => setSelectedEntry(entry)
  const handleCloseDetail = () => setSelectedEntry(null)

  const handleNoteSaved = (flashcardId: string, note: string | null) => {
    setEntries((prev) => prev.map((e) => (e.flashcardId === flashcardId ? { ...e, note } : e)))
  }

  // Level update with optimistic local update
  const handleLevelChange = async (flashcardId: string, newLevel: UnderstandingLevel) => {
    const prevEntry = entries.find((e) => e.flashcardId === flashcardId)
    if (!prevEntry) return

    setEntries((prev) =>
      prev.map((e) => (e.flashcardId === flashcardId ? { ...e, level: newLevel } : e))
    )
    if (selectedEntry?.flashcardId === flashcardId) {
      setSelectedEntry((prev) => (prev ? { ...prev, level: newLevel } : null))
    }

    try {
      await notebookApi.setNotebookEntryLevel(flashcardId, newLevel)
      onChanged?.()
    } catch {
      setEntries((prev) =>
        prev.map((e) => (e.flashcardId === flashcardId ? prevEntry : e))
      )
      if (selectedEntry?.flashcardId === flashcardId) {
        setSelectedEntry(prevEntry)
      }
      toast({
        title: 'Cập nhật thất bại',
        description: 'Không thể thay đổi mức độ hiểu. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  // Delete entry with optimistic update
  const handleDeleteEntry = async (flashcardId: string) => {
    const entryToDelete = entries.find((e) => e.flashcardId === flashcardId)
    if (!entryToDelete) return

    setEntries((prev) => prev.filter((e) => e.flashcardId !== flashcardId))
    setTotalEntries((prev) => Math.max(0, prev - 1))
    handleCloseDetail()

    try {
      await notebookApi.deleteNotebookEntry(flashcardId)
      onChanged?.()
      toast({
        title: `Đã gỡ "${entryToDelete.lemma}" khỏi sổ tay`,
        tone: 'info',
      })
    } catch {
      setEntries((prev) => [entryToDelete, ...prev])
      setTotalEntries((prev) => prev + 1)
      toast({
        title: 'Xóa thất bại',
        description: 'Không thể gỡ từ khỏi sổ tay. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  // Drawer Navigation between items
  const currentIndex = selectedEntry
    ? entries.findIndex((e) => e.flashcardId === selectedEntry.flashcardId)
    : -1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < entries.length - 1

  const handleNavigatePrev = () => {
    if (hasPrev) setSelectedEntry(entries[currentIndex - 1])
  }

  const handleNavigateNext = () => {
    if (hasNext) setSelectedEntry(entries[currentIndex + 1])
  }

  // Quick Add callback
  const handleWordAdded = () => {
    onChanged?.()
    fetchEntries(0, false)
  }

  // Searching the notebook also searches the dictionary
  const dictionary = useDictionarySearch(searchQuery, 'EN', { size: 8, delayMs: 0 })
  const dictionarySaver = useNotebookSaver(dictionary.items, handleWordAdded)
  const notSavedYet = dictionary.items.filter((item) =>
    item.senses.some((sense) => !dictionarySaver.savedSenseIds.has(sense.id))
  )

  const hasActiveFilters = searchQuery !== '' || levelParams.length > 0 || dueParam

  return (
    <>
      {/* Secondary Practice Link: Luyện theo mức hiểu */}
      <div className="nb-words-practice-bar">
        <Link to="/vocabulary/notebook/review" className="nb-words-practice-btn">
          <Sparkles size={16} aria-hidden="true" />
          <span>Luyện theo mức hiểu</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {/* Quick add from the dictionary */}
      <QuickAddWord onWordAdded={handleWordAdded} />

      {/* Toolbar: Search, Filters, Sort, View Toggle */}
      <NotebookToolbar
        searchQuery={searchQuery}
        onSearchChange={updateSearchQuery}
        selectedLevels={levelParams}
        onLevelToggle={toggleLevelFilter}
        onClearLevels={clearLevelFilters}
        isDueOnly={dueParam}
        onDueToggle={toggleDueOnly}
        sort={sortParam}
        onSortChange={updateSort}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        summary={summary}
      />

      {/* Dictionary words matching the search that are not in the notebook yet */}
      {searchQuery && notSavedYet.length > 0 && (
        <section className="nb-suggest" aria-label="Gợi ý từ từ điển">
          <div className="nb-suggest__head">
            <Library size={17} aria-hidden="true" />
            <h2>Từ điển có {dictionary.total} từ khớp “{dictionary.query}”</h2>
            <span>Nhấn “Thêm” để lưu vào sổ tay</span>
          </div>
          <DictionaryPickList
            items={notSavedYet}
            keyword={dictionary.query}
            lang={dictionary.lang}
            max={6}
            savedSenseIds={dictionarySaver.savedSenseIds}
            savingSenseId={dictionarySaver.savingSenseId}
            onSave={(sense, lemma) => void dictionarySaver.save(sense, lemma)}
          />
        </section>
      )}

      {/* Main Cards Grid / List */}
      {isEntriesLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr',
            gap: '1.25rem',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: viewMode === 'grid' ? '180px' : '90px',
                background: '#f8fafc',
                borderRadius: '1rem',
                border: '1px solid #e2e8f0',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
          ))}
        </div>
      ) : entriesError ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#1e293b' }}>
            Không thể tải sổ từ vựng
          </h3>
          <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>{entriesError}</p>
          <button
            type="button"
            onClick={() => fetchEntries(0, false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              background: 'var(--classroom-primary, #123ab5)',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} /> Thử lại
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1.5rem',
            background: '#ffffff',
            borderRadius: '1.25rem',
            border: '1px dashed #cbd5e1',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🦉</div>
          {hasActiveFilters ? (
            <>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>
                Không tìm thấy từ vựng nào
              </h3>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '420px', marginInline: 'auto' }}>
                Thử thay đổi từ khóa tìm kiếm hoặc bỏ các tiêu chí lọc để xem thêm từ.
              </p>
              <button
                type="button"
                onClick={() => setSearchParams({})}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Xóa tất cả bộ lọc
              </button>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>
                Sổ tay của bạn đang trống
              </h3>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '460px', marginInline: 'auto' }}>
                Tra từ điển hoặc lưu từ mới từ các bài học để xây dựng vốn từ vựng học thuật vững chắc.
              </p>
              <Link
                to="/vocabulary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.85rem',
                  background: 'var(--classroom-primary, #123ab5)',
                  color: 'white',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <BookOpen size={18} /> Khám phá Từ điển ngay
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr',
              gap: '1.25rem',
            }}
          >
            {entries.map((entry) => (
              <WordCard
                key={entry.flashcardId}
                entry={entry}
                viewMode={viewMode}
                onClick={handleOpenDetail}
              />
            ))}
          </div>

          {/* Load More Pagination */}
          {entries.length < totalEntries && (
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <button
                type="button"
                onClick={() => fetchEntries(page + 1, true)}
                disabled={isLoadingMore}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 2rem',
                  borderRadius: '0.85rem',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.925rem',
                  cursor: 'pointer',
                  color: '#1e293b',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                {isLoadingMore ? <RefreshCw size={16} className="vocab-spin" /> : null}
                {isLoadingMore ? 'Đang tải thêm...' : `Tải thêm (${entries.length} / ${totalEntries})`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Popup chi tiết từ */}
      <WordDetailDialog
        entry={selectedEntry}
        onClose={handleCloseDetail}
        onNoteSaved={handleNoteSaved}
        onLevelChange={handleLevelChange}
        onDelete={handleDeleteEntry}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />
    </>
  )
}
