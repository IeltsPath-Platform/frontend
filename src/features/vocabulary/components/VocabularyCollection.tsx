import { BookmarkPlus, Leaf, Search, Volume2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { VocabularyEntry } from '@/types/lesson'
import '../vocabulary.css'

interface VocabularyCollectionProps {
  entries: readonly VocabularyEntry[]
  eyebrow: string
  title: string
  description: string
}

export function VocabularyCollection({ entries, eyebrow, title, description }: VocabularyCollectionProps) {
  const [query, setQuery] = useState('')
  const [savedEntries, setSavedEntries] = useState<Record<string, boolean>>({})
  const [pronunciationMessage, setPronunciationMessage] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visibleEntries = useMemo(() => entries.filter((entry) => [entry.word, entry.meaning, entry.translation, ...entry.tags].join(' ').toLowerCase().includes(normalizedQuery)), [entries, normalizedQuery])

  function pronounce(entry: VocabularyEntry) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setPronunciationMessage('Thiết bị này chưa hỗ trợ phát âm thanh.')
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(entry.word)
    utterance.lang = 'en-GB'
    utterance.onend = () => setPronunciationMessage(`Đã phát cách đọc: ${entry.word}.`)
    utterance.onerror = () => setPronunciationMessage('Không thể phát âm thanh trên thiết bị này.')
    window.speechSynthesis.speak(utterance)
    setPronunciationMessage(`Đang phát cách đọc: ${entry.word}.`)
  }

  return (
    <section className="vocabulary-collection" aria-labelledby="vocabulary-collection-heading">
      <header className="vocabulary-collection-heading"><div><p>{eyebrow}</p><h1 id="vocabulary-collection-heading">{title}</h1><span>{description}</span></div><label className="vocabulary-search"><Search aria-hidden="true" size={18} /><span className="sr-only">Tìm từ vựng</span><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm từ, nghĩa hoặc chủ đề" /></label></header>
      <p className="sr-only" role="status" aria-live="polite">{pronunciationMessage}</p>
      <div className="vocabulary-filter-row"><span>{visibleEntries.length} từ phù hợp</span><span>Nature &amp; Environment</span></div>
      <div className="vocabulary-entry-list">{visibleEntries.map((entry) => <article key={entry.id} className="vocabulary-entry-card"><div className="vocabulary-entry-copy"><div className="vocabulary-word-row"><h2>{entry.word}</h2><span>{entry.partOfSpeech}</span><strong>{entry.level}</strong><Button type="button" variant="ghost" size="icon" className="vocabulary-icon-button" onClick={() => pronounce(entry)} aria-label={`Nghe phát âm từ ${entry.word}`}><Volume2 aria-hidden="true" size={18} /></Button></div><div className="vocabulary-phonetics"><span>UK {entry.phoneticUk}</span><span>US {entry.phoneticUs}</span></div><p>{entry.meaning}</p><div className="vocabulary-translation"><span>{entry.partOfSpeech}</span><strong>{entry.level}</strong><b>{entry.translation}</b><Button type="button" variant="ghost" size="icon" className={`vocabulary-icon-button${savedEntries[entry.id] ? ' is-saved' : ''}`} aria-label={`${savedEntries[entry.id] ? 'Bỏ lưu' : 'Lưu'} từ ${entry.word}`} aria-pressed={Boolean(savedEntries[entry.id])} onClick={() => setSavedEntries((current) => ({ ...current, [entry.id]: !current[entry.id] }))}><BookmarkPlus aria-hidden="true" size={18} /></Button></div><div className="vocabulary-tags">{entry.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><blockquote>{entry.example}</blockquote></div><div className="vocabulary-memory-image" aria-label={`Hình ảnh gợi nhớ cho từ ${entry.word}`}><span>Hình ảnh gợi nhớ</span><Leaf aria-hidden="true" size={42} /><i /></div></article>)}</div>
      {visibleEntries.length === 0 && <div className="vocabulary-empty"><Leaf aria-hidden="true" size={24} /><p>Không tìm thấy từ phù hợp. Hãy thử một từ khóa khác.</p></div>}
    </section>
  )
}
