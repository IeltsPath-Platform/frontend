import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { getLessonVocabularySenses } from '@/features/learning-path/api/lessonVocabularyApi'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { adminErrorMessage } from '../../lib/adminErrors'
import { suggestVocabulary, type VocabularyHit } from '../api/lessonApi'
import { CreateVocabularyDrawer } from './CreateVocabularyDrawer'

const SEARCH_DELAY_MS = 300

function VocabularySearchResults({ query, value, onAdd, onCreate }: {
  query: string
  value: string[]
  onAdd: (id: string) => void
  /** Set for authors: offers to create the searched word when the library has no match. */
  onCreate?: () => void
}) {
  const first = useAdminResource(`vocabulary-suggestions|${query}`, (signal) => suggestVocabulary(query, 0, signal))
  const [more, setMore] = useState({ content: [] as VocabularyHit[], page: 0, hasMore: null as boolean | null, busy: false, error: null as string | null })
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const hasMore = more.hasMore ?? first.data?.hasMore ?? false
  const matches = [...(first.data?.content ?? []), ...more.content].flatMap((hit) => (hit.senses ?? [])
    .filter((sense) => sense.status !== 'INACTIVE')
    .map((sense) => ({ lemma: hit.lemma, sense })))

  async function loadMore() {
    if (controller.current || !hasMore) return
    const request = new AbortController()
    controller.current = request
    setMore((current) => ({ ...current, busy: true, error: null }))
    try {
      const next = await suggestVocabulary(query, more.page + 1, request.signal)
      if (request.signal.aborted) return
      setMore((current) => ({ content: [...current.content, ...next.content], page: next.page, hasMore: next.hasMore, busy: false, error: null }))
    } catch (reason) {
      if (!request.signal.aborted) setMore((current) => ({ ...current, busy: false, error: adminErrorMessage(reason) }))
    } finally {
      if (controller.current === request) controller.current = null
    }
  }

  return (
    <div aria-busy={first.status === 'loading' || more.busy}>
      {first.status === 'loading' ? <AdminLoading label="Đang tìm từ vựng…" /> : null}
      {first.status === 'error' ? <AdminError message={first.error ?? 'Không tìm được từ vựng.'} onRetry={first.reload} /> : null}
      {first.status === 'success' && matches.length === 0 ? (
        <p className="adm-muted" role="status">
          Không tìm thấy từ nào.{onCreate ? <> <button className="adm-btn adm-btn--small" onClick={onCreate} type="button"><Plus aria-hidden="true" size={14} /> Tạo “{query}” mới</button></> : null}
        </p>
      ) : null}
      <ul className="ls-vocab__hits">
        {matches.map(({ lemma, sense }) => (
          <li key={sense.id}>
            <span><strong>{lemma}</strong> <span className="adm-muted">{sense.partOfSpeech} · {sense.vietnameseMeaning ?? sense.englishDefinition}</span></span>
            <button className="adm-btn adm-btn--small" disabled={value.includes(sense.id)} onClick={() => onAdd(sense.id)} type="button">
              {value.includes(sense.id) ? 'Đã chọn' : 'Thêm'}
            </button>
          </li>
        ))}
      </ul>
      {more.error ? <AdminError message={more.error} onRetry={() => void loadMore()} /> : null}
      {hasMore && !more.error ? (
        <button className="adm-btn adm-btn--small ls-vocab__more" disabled={more.busy} onClick={() => void loadMore()} type="button">
          {more.busy ? 'Đang tải…' : 'Tải thêm'}
        </button>
      ) : null}
    </div>
  )
}

/**
 * Picks senses from the vocabulary library, with separate scrolling areas for chosen words and search results.
 * `canCreate` (content authors) adds a way to create a word the library does not have.
 */
export function VocabularySensePicker({ value, onChange, canCreate = false }: {
  value: string[]
  onChange: (next: string[]) => void
  canCreate?: boolean
}) {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [revision, setRevision] = useState(0)
  /** The word the create drawer opens with, or null while it is closed. */
  const [creating, setCreating] = useState<string | null>(null)
  const resultsId = useId()

  const chosen = useAdminResource(`block-senses|${value.join(',')}`, (signal) => getLessonVocabularySenses(value, signal))
  const currentQuery = Boolean(text.trim()) && text.trim() === query

  useEffect(() => {
    if (text.trim().length < 2) return
    const timer = window.setTimeout(() => setQuery(text.trim()), SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [text])

  function search(event: FormEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (!text.trim()) return
    if (query === text.trim()) setRevision((current) => current + 1)
    else setQuery(text.trim())
  }

  const add = (id: string) => onChange(value.includes(id) ? value : [...value, id])

  /** After a word is created it is chosen at once, and the search shows it so the author sees the new row. */
  function created(senseId: string, lemma: string) {
    add(senseId)
    setText(lemma)
    setQuery(lemma)
    setRevision((current) => current + 1)
    setCreating(null)
  }

  return (
    <div className="ls-vocab">
      <div className="ls-vocab__find">
        <form className="ls-vocab__search" onSubmit={search}>
          <input aria-controls={resultsId} aria-label="Tìm từ vựng" className="adm-input" maxLength={100} onChange={(event) => {
            const next = event.target.value
            setText(next)
            if (next.trim().length < 2) setQuery('')
          }} placeholder="Tìm từ (ví dụ: climate)" value={text} />
          <button className="adm-btn" disabled={!text.trim()} type="submit"><Search aria-hidden="true" size={14} /> Tìm</button>
          {canCreate ? <button className="adm-btn" onClick={() => setCreating(text.trim())} type="button"><Plus aria-hidden="true" size={14} /> Tạo từ mới</button> : null}
        </form>
        <div aria-label="Kết quả tìm từ vựng" className="ls-vocab__results" id={resultsId} role="region" tabIndex={0}>
          {currentQuery ? (
            <VocabularySearchResults
              key={`${query}|${revision}`}
              onAdd={add}
              onCreate={canCreate ? () => setCreating(query) : undefined}
              query={query}
              value={value}
            />
          ) : null}
        </div>
      </div>

      <div className="ls-vocab__selection">
        <h4>Nghĩa đã chọn ({value.length})</h4>
        {value.length === 0 ? <p className="adm-muted">Chưa chọn nghĩa nào.</p> : null}
        {value.length > 0 && chosen.status === 'loading' ? <AdminLoading label="Đang tải từ vựng…" /> : null}
        <ul className="ls-vocab__list">
          {value.map((id) => {
            const card = chosen.data?.find((item) => item.senseId === id)
            return (
              <li key={id}>
                <span>
                  <strong>{card?.lemma ?? 'Nghĩa không còn khả dụng'}</strong>{' '}
                  <span className="adm-muted">{card?.partOfSpeech ? `${card.partOfSpeech} · ` : ''}{card?.vietnameseMeaning ?? id.slice(0, 8)}</span>
                </span>
                <button aria-label={`Bỏ ${card?.lemma ?? id}`} className="adm-btn adm-btn--small" onClick={() => onChange(value.filter((item) => item !== id))} type="button">
                  <X aria-hidden="true" size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      {creating !== null ? <CreateVocabularyDrawer initialLemma={creating} onClose={() => setCreating(null)} onCreated={created} /> : null}
    </div>
  )
}
