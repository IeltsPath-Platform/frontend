import { useState, type FormEvent } from 'react'
import { Check, Search } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminError } from '../../lib/useAdminError'
import { searchVocabulary, type VocabularyHit } from '../../lessons/api/lessonApi'
import { PART_OF_SPEECH_LABELS } from '../lib/courseDraftLabels'
import type { CourseNewWord } from '../types'

/**
 * Searches the vocabulary library and adds its senses to the lesson. Each sense is added as it is picked, so closing
 * the dialog keeps what was chosen, as the knowledge-point dialog does.
 */
export function VocabularyLibraryDialog({ picked, total, limit, onAdd, onClose }: {
  picked: readonly string[]; total: number; limit: number; onAdd: (senseId: string) => void; onClose: () => void
}) {
  const [text, setText] = useState('')
  const [hits, setHits] = useState<VocabularyHit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [, setError] = useAdminError()
  const atLimit = total >= limit

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

  const rows = (hits ?? []).flatMap((hit) => (hit.senses ?? []).filter((sense) => sense.status !== 'INACTIVE').map((sense) => ({ hit, sense })))

  return <AdminModal title="Chọn từ thư viện" stacked onClose={onClose}>
    {(close) => <>
      <form className="adm-vocab-search" onSubmit={(event) => void search(event)}>
        <label className="adm-kp-search">
          <Search aria-hidden="true" size={16} />
          <input aria-label="Tìm từ vựng" autoFocus className="adm-input" onChange={(event) => setText(event.target.value)} placeholder="Nhập từ cần tìm, ví dụ: climate" type="search" value={text} />
        </label>
        <button className="adm-btn adm-btn--primary" disabled={searching} type="submit">Tìm</button>
      </form>
      <small aria-live="polite" className="adm-muted">{total}/{limit} từ trong bài{atLimit ? ' · đã đạt tối đa' : ''}</small>
      {hits === null ? <p className="adm-muted adm-vocab-hits__empty">Tìm một từ để thêm nghĩa có sẵn của thư viện vào bài.</p>
        : rows.length === 0 ? <p className="adm-muted adm-vocab-hits__empty">Không tìm thấy từ nào.</p>
        : <ul aria-label="Kết quả tìm từ vựng" className="adm-vocab-hits">
          {rows.map(({ hit, sense }) => {
            const chosen = picked.includes(sense.id)
            const part = PART_OF_SPEECH_LABELS[sense.partOfSpeech as CourseNewWord['partOfSpeech']] ?? sense.partOfSpeech
            const meaning = sense.vietnameseMeaning ?? sense.englishDefinition ?? ''
            return <li className={chosen ? 'is-picked' : undefined} key={sense.id}>
              <span className="adm-vocab-hit__text">
                <span className="adm-vocab-hit__title">{hit.lemma}{part ? <em>{part}</em> : null}</span>
                <span>{meaning}</span>
                {sense.exampleSentence ? <small>{sense.exampleSentence}</small> : null}
              </span>
              {chosen
                ? <span className="adm-badge adm-badge--ok"><Check aria-hidden="true" size={12} />Đã chọn</span>
                : <button aria-label={`Thêm ${hit.lemma}: ${meaning}`} className="adm-btn adm-btn--primary adm-btn--small" disabled={atLimit} onClick={() => onAdd(sense.id)} type="button">Thêm</button>}
            </li>
          })}
        </ul>}
      <div className="adm-form-footer"><button className="adm-btn adm-btn--primary" onClick={close} type="button">Lưu</button></div>
    </>}
  </AdminModal>
}
