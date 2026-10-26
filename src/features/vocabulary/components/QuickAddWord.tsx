import { useEffect, useRef, useState } from 'react'
import { Plus, Search, Loader2, BookmarkPlus } from 'lucide-react'
import { notebookApi, type VocabularyCatalogSense } from '../api/notebookApi'
import { useToast } from '@/components/toast/toastContext'

interface QuickAddWordProps {
  onWordAdded?: (senseId: string) => void
}

interface SearchHit {
  id: string
  lemma: string
  senses: VocabularyCatalogSense[]
}

export function QuickAddWord({ onWordAdded }: QuickAddWordProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [addingSenseId, setAddingSenseId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { toast } = useToast()

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const handleSearch = (text: string) => {
    setQuery(text)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    if (!text.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceTimer.current = setTimeout(async () => {
      try {
        const hits = await notebookApi.searchVocabulary(text)
        setResults(hits || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const handleAddSense = async (sense: VocabularyCatalogSense, lemma: string) => {
    setAddingSenseId(sense.id)
    try {
      await notebookApi.saveNotebookEntry(sense.id)
      toast({
        title: `Đã lưu "${lemma}" vào sổ tay`,
        description: sense.vietnameseMeaning || sense.englishDefinition || undefined,
        tone: 'success',
      })
      onWordAdded?.(sense.id)
      setQuery('')
      setIsOpen(false)
    } catch {
      toast({
        title: 'Không thể thêm từ',
        description: 'Vui lòng thử lại sau.',
        tone: 'error',
      })
    } finally {
      setAddingSenseId(null)
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          background: 'var(--classroom-primary, #123ab5)',
          color: '#ffffff',
          border: 'none',
          padding: '0.55rem 1rem',
          borderRadius: '0.65rem',
          fontWeight: 700,
          fontSize: '0.85rem',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(18, 58, 181, 0.2)',
        }}
        aria-expanded={isOpen}
      >
        <Plus size={16} aria-hidden="true" />
        Thêm từ nhanh
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: 0,
            width: '360px',
            maxWidth: '90vw',
            background: '#ffffff',
            borderRadius: '0.85rem',
            border: '1px solid var(--classroom-border, #e3e7ef)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
            zIndex: 50,
            padding: '0.75rem',
          }}
        >
          <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              aria-hidden="true"
            />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Nhập từ cần thêm..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', color: '#64748b', fontSize: '0.85rem', gap: '0.4rem' }}>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Đang tìm từ vựng…
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.825rem', margin: '0.75rem 0' }}>
                Không tìm thấy từ "{query}" trong kho.
              </p>
            )}

            {!loading && results.map((item) => (
              <div key={item.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem', marginBottom: '0.4rem' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }} lang="en">
                  {item.lemma}
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                  {item.senses.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleAddSense(s, item.lemma)}
                      disabled={addingSenseId === s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.4rem',
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        color: '#334155',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.vietnameseMeaning || s.englishDefinition || 'Chọn nghĩa này'}
                      </span>
                      <BookmarkPlus size={14} style={{ color: 'var(--classroom-primary, #123ab5)', flexShrink: 0, marginLeft: '0.5rem' }} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
