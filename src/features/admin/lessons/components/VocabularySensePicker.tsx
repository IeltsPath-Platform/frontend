import { useState, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'
import { getLessonVocabularySenses } from '@/features/learning-path/api/lessonVocabularyApi'
import { AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminResource } from '../../lib/useAdminResource'
import { searchVocabulary, type VocabularyHit } from '../api/lessonApi'
import { useAdminError } from '../../lib/useAdminError'

/** Picks the vocabulary senses of a block: the chosen ones are shown as cards, new ones come from a search. */
export function VocabularySensePicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [text, setText] = useState('')
  const [hits, setHits] = useState<VocabularyHit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [, setError] = useAdminError()

  const chosen = useAdminResource(`block-senses|${value.join(',')}`, (signal) => getLessonVocabularySenses(value, signal))

  async function search(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    setSearching(true)
    setError(null)
    try {
      setHits(await searchVocabulary(text.trim()))
    } catch (reason) {
      setError(adminErrorMessage(reason))
    } finally {
      setSearching(false)
    }
  }

  const add = (id: string) => onChange(value.includes(id) ? value : [...value, id])

  return (
    <div className="ls-vocab">
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
                <span className="adm-muted">{card?.vietnameseMeaning ?? id.slice(0, 8)}</span>
              </span>
              <button aria-label={`Bỏ ${card?.lemma ?? id}`} className="adm-btn adm-btn--small" onClick={() => onChange(value.filter((item) => item !== id))} type="button">
                <X aria-hidden="true" size={14} />
              </button>
            </li>
          )
        })}
      </ul>

      <form className="ls-vocab__search" onSubmit={(event) => void search(event)}>
        <input aria-label="Tìm từ vựng" className="adm-input" onChange={(event) => setText(event.target.value)} placeholder="Tìm từ (ví dụ: climate)" value={text} />
        <button className="adm-btn" disabled={searching} type="submit"><Search aria-hidden="true" size={14} /> Tìm</button>
      </form>
      {hits && hits.length === 0 ? <p className="adm-muted">Không tìm thấy từ nào.</p> : null}
      <ul className="ls-vocab__hits">
        {(hits ?? []).flatMap((hit) =>
          (hit.senses ?? []).filter((sense) => sense.status !== 'INACTIVE').map((sense) => (
            <li key={sense.id}>
              <span>
                <strong>{hit.lemma}</strong> <span className="adm-muted">{sense.partOfSpeech} · {sense.vietnameseMeaning ?? sense.englishDefinition}</span>
              </span>
              <button className="adm-btn adm-btn--small" disabled={value.includes(sense.id)} onClick={() => add(sense.id)} type="button">
                {value.includes(sense.id) ? 'Đã chọn' : 'Thêm'}
              </button>
            </li>
          )))}
      </ul>
    </div>
  )
}
