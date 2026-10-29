import { useId, useState, type FormEvent } from 'react'
import { BookPlus, Eye, Library, Trash2, X } from 'lucide-react'
import { getLessonVocabularySenses } from '@/features/learning-path/api/lessonVocabularyApi'
import { AdminModal } from '../../components/AdminLayer'
import { useAdminResource } from '../../lib/useAdminResource'
import { findVocabularyByLemmas } from '../../lessons/api/lessonApi'
import { PART_OF_SPEECH_LABELS } from '../lib/courseDraftLabels'
import { reviewAdvice, reviewWord, type LibrarySense, type WordReview } from '../lib/vocabularyReview'
import { COURSE_NEW_WORD_LIMIT, COURSE_PARTS_OF_SPEECH, COURSE_VOCABULARY_LIMIT, courseNewWordSchema, type CourseLesson, type CourseNewWord } from '../types'
import '../../lessons/lessons.css'
import { useAdminError } from '../../lib/useAdminError'
import { VocabularyLibraryDialog } from './VocabularyLibraryDialog'

const EMPTY_WORD: CourseNewWord = { lemma: '', ipa: '', partOfSpeech: 'NOUN', englishDefinition: '', vietnameseMeaning: '', exampleSentence: '' }
const key = (lemma: string) => lemma.trim().toLowerCase()

/**
 * The vocabulary of a lesson: senses already in the library, picked by search, and the words the model proposed. A
 * proposed word is reviewed here and only written to the library when the draft is approved. For a word the library
 * already has under other meanings the author decides: keep the proposal, which is then added as one more meaning of the
 * word, or adopt one of the library's meanings instead, which leaves the library as it is.
 */
export function CourseLessonVocabulary({ value, onChange, disabled }: {
  value: CourseLesson; onChange: (next: CourseLesson) => void; disabled: boolean
}) {
  const picked = value.vocabularySenseIds ?? []
  const words = value.newVocabulary ?? []
  const total = picked.length + words.length
  const full = words.length >= COURSE_NEW_WORD_LIMIT || total >= COURSE_VOCABULARY_LIMIT
  const [editing, setEditing] = useState<{ index: number | null; word: CourseNewWord } | null>(null)
  const [searching, setSearching] = useState(false)

  const cards = useAdminResource(`course-picked-senses|${picked.join(',')}`, (signal) => getLessonVocabularySenses(picked, signal))
  const lemmas = [...new Set(words.map((word) => key(word.lemma)))]
  const found = useAdminResource(`course-new-words|${lemmas.join(',')}`, (signal) => (lemmas.length ? findVocabularyByLemmas(lemmas, signal) : Promise.resolve([])))
  const library = new Map((found.data ?? []).map((hit) => [key(hit.lemma), hit]))
  const reviewOf = (word: CourseNewWord): WordReview => reviewWord(word, library.get(key(word.lemma)))

  /** A sense of the library replaces the proposal, so the lesson does not carry the same word twice. */
  function adopt(index: number, sense: LibrarySense) {
    onChange({ ...value, vocabularySenseIds: picked.includes(sense.id) ? picked : [...picked, sense.id], newVocabulary: words.filter((_, position) => position !== index) })
  }
  function save(word: CourseNewWord, index: number | null) {
    const next = index === null ? [...words, word] : words.map((item, position) => (position === index ? word : item))
    onChange({ ...value, newVocabulary: next })
  }

  return <div className="adm-sec">
    <div className="adm-sec__head">
      <h5 className="adm-sec__title">Từ vựng<span className="adm-count">{total}/{COURSE_VOCABULARY_LIMIT}</span></h5>
      <div className="adm-sec__tools">
        <button className="adm-btn adm-btn--small" disabled={disabled || total >= COURSE_VOCABULARY_LIMIT} onClick={() => setSearching(true)} type="button"><Library aria-hidden="true" size={14} />Chọn từ thư viện</button>
        <button className="adm-btn adm-btn--small" disabled={disabled || full} onClick={() => setEditing({ index: null, word: EMPTY_WORD })} type="button"><BookPlus aria-hidden="true" size={14} />Thêm từ mới</button>
      </div>
    </div>
    <div className="adm-table-wrap adm-kp-table">
      <table aria-label="Từ vựng của bài" className="adm-table">
        <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Từ</th><th scope="col">Loại từ</th><th scope="col">Nghĩa tiếng Việt</th><th scope="col">Câu ví dụ</th><th scope="col">Thư viện</th><th aria-label="Thao tác" scope="col" /></tr></thead>
        <tbody>{total === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={7}>Chưa có từ vựng nào.</td></tr> : null}
          {picked.map((id, index) => {
            const card = cards.data?.find((item) => item.senseId === id)
            return <tr key={id}>
              <td className="adm-stt">{index + 1}</td>
              <td>{card ? <strong>{card.lemma}</strong> : <span className="adm-muted">{cards.status === 'loading' ? 'Đang tải…' : 'Nghĩa không còn khả dụng'}</span>}</td>
              <td>{card ? PART_OF_SPEECH_LABELS[card.partOfSpeech as CourseNewWord['partOfSpeech']] ?? card.partOfSpeech : ''}</td>
              <td>{card?.vietnameseMeaning ?? card?.englishDefinition ?? ''}</td>
              <td>{card?.exampleSentence ?? ''}</td>
              <td>{card || cards.status === 'loading' ? <span className="adm-badge adm-badge--ok adm-vocab-badge">Đã có</span> : <span className="adm-badge adm-badge--warn">Không còn khả dụng</span>}</td>
              <td className="adm-kp-table__remove adm-qrow__tools">
                <button aria-label={`Bỏ từ ${card?.lemma ?? id}`} disabled={disabled} onClick={() => onChange({ ...value, vocabularySenseIds: picked.filter((item) => item !== id) })} type="button"><X aria-hidden="true" size={16} /></button>
              </td>
            </tr>
          })}
          {words.map((word, index) => {
          const review = reviewOf(word)
          return <tr key={`${word.lemma}-${index}`}>
            <td className="adm-stt">{picked.length + index + 1}</td>
            <td><strong>{word.lemma}</strong></td>
            <td>{PART_OF_SPEECH_LABELS[word.partOfSpeech]}</td>
            <td>{word.vietnameseMeaning}</td>
            <td>{word.exampleSentence}</td>
            <td>{found.status === 'loading' ? <span className="adm-muted">Đang kiểm tra…</span>
              : found.status === 'error' ? <span className="adm-muted">Chưa kiểm tra được</span>
              : <LibraryStatus review={review} />}</td>
            <td className="adm-kp-table__remove adm-qrow__tools">
              <button aria-label={`Xem chi tiết từ ${word.lemma}`} onClick={() => setEditing({ index, word })} type="button"><Eye aria-hidden="true" size={16} /></button>
            </td>
          </tr>
        })}</tbody>
      </table>
    </div>
    {searching ? <VocabularyLibraryDialog limit={COURSE_VOCABULARY_LIMIT} onAdd={(senseId) => onChange({ ...value, vocabularySenseIds: picked.includes(senseId) ? picked : [...picked, senseId] })} onClose={() => setSearching(false)} picked={picked} total={total} /> : null}
    {editing ? <WordDialog
      index={editing.index} initial={editing.word} others={words.filter((_, position) => position !== editing.index)} readOnly={disabled}
      review={editing.index === null ? undefined : reviewOf(editing.word)}
      onAdopt={editing.index === null ? undefined : (sense) => adopt(editing.index!, sense)}
      onRemove={editing.index === null ? undefined : () => onChange({ ...value, newVocabulary: words.filter((_, position) => position !== editing.index) })}
      onClose={() => setEditing(null)} onSave={(word) => save(word, editing.index)} /> : null}
  </div>
}

const meaningOf = (sense: LibrarySense) => sense.vietnameseMeaning ?? sense.englishDefinition ?? ''
const partLabel = (sense: LibrarySense) => PART_OF_SPEECH_LABELS[sense.partOfSpeech as CourseNewWord['partOfSpeech']] ?? sense.partOfSpeech ?? ''

/** What approval will do with a proposed word, in one badge, and the library's meaning when it differs. */
function LibraryStatus({ review }: { review: WordReview }) {
  if (review.kind === 'new') return <span className="adm-badge adm-badge--warn adm-vocab-badge">Từ mới</span>
  if (review.kind === 'same') return <span className="adm-badge adm-badge--ok">Đã có</span>
  const first = review.senses[0]!
  return <>
    <span className="adm-badge adm-badge--warn adm-vocab-badge">{review.similar ? 'Gần nghĩa có sẵn' : 'Thêm nghĩa mới'}</span>
    <small className="adm-muted adm-vocab-library">Thư viện: {meaningOf(review.similar ?? first)}{review.senses.length > 1 && !review.similar ? ` +${review.senses.length - 1}` : ''}</small>
  </>
}

/**
 * One proposed word: adds a new one, or shows an existing one with what the library holds for it. The fields are
 * read-only when the draft cannot be edited; otherwise the word can be saved, removed or swapped for a sense of the
 * library. The lemma may not repeat another word of the lesson.
 */
function WordDialog({ index, initial, others, readOnly, review, onAdopt, onRemove, onClose, onSave }: {
  index: number | null; initial: CourseNewWord; others: readonly CourseNewWord[]; readOnly: boolean; review?: WordReview
  onAdopt?: (sense: LibrarySense) => void; onRemove?: () => void; onClose: () => void; onSave: (word: CourseNewWord) => void
}) {
  const title = index === null ? 'Thêm từ vựng' : 'Chi tiết từ vựng'
  const [word, setWord] = useState<CourseNewWord>({ ...EMPTY_WORD, ...initial, ipa: initial.ipa ?? '', englishDefinition: initial.englishDefinition ?? '' })
  const [, setError] = useAdminError()
  const group = useId()
  const set = (patch: Partial<CourseNewWord>) => setWord((current) => ({ ...current, ...patch }))

  function submit(event: FormEvent, close: () => void) {
    event.preventDefault()
    if (readOnly) return
    const clean: CourseNewWord = {
      lemma: word.lemma.trim(), ipa: word.ipa?.trim() || null, partOfSpeech: word.partOfSpeech,
      englishDefinition: word.englishDefinition?.trim() || null, vietnameseMeaning: word.vietnameseMeaning.trim(), exampleSentence: word.exampleSentence.trim(),
    }
    if (!clean.lemma) { setError('Nhập từ vựng.'); return }
    if (!clean.vietnameseMeaning) { setError('Nhập nghĩa tiếng Việt.'); return }
    if (!clean.exampleSentence) { setError('Nhập câu ví dụ.'); return }
    if (others.some((other) => key(other.lemma) === key(clean.lemma))) { setError('Từ này đã có trong bài.'); return }
    if (!courseNewWordSchema.safeParse(clean).success) { setError('Từ vựng chỉ gồm chữ cái, số, khoảng trắng, dấu nháy, dấu chấm và gạch ngang; mỗi trường không quá dài.'); return }
    onSave(clean)
    close()
  }

  return <AdminModal title={title} onClose={onClose} stacked>
    {(close) => <form aria-label={title} noValidate onSubmit={(event) => submit(event, close)}>
      {index !== null ? <div className="adm-sec">
        <h5 className="adm-sec__title">Trong thư viện</h5>
        {review && review.kind !== 'new'
          ? <>
            {review.kind === 'same'
              ? <small className="adm-muted adm-vocab-note">Thư viện đã có đúng nghĩa này. Khi duyệt, bài dùng lại nghĩa đó và không thêm gì.</small>
              : <p className="adm-vocab-advice" role="note">{reviewAdvice(initial, review)}</p>}
            <ul className="adm-vocab-senses">
              {(review.kind === 'same' ? [review.sense] : review.senses).map((sense) => <li key={sense.id}>
                <div>
                  <strong>{meaningOf(sense)}</strong>{partLabel(sense) ? <span className="adm-muted"> · {partLabel(sense)}</span> : null}
                  {sense.exampleSentence ? <p className="adm-muted">{sense.exampleSentence}</p> : null}
                </div>
                {!readOnly && onAdopt ? <button aria-label={`Dùng nghĩa “${meaningOf(sense)}”`} className="adm-btn adm-btn--small" onClick={() => { onAdopt(sense); close() }} type="button">{review.kind === 'different' ? `Dùng thay “${initial.vietnameseMeaning}”` : 'Dùng nghĩa này'}</button> : null}
              </li>)}
            </ul>
            {review.kind === 'different' ? <ul className="adm-vocab-note adm-muted">
              <li><strong>Giữ “{initial.vietnameseMeaning}”:</strong> bấm Lưu. Khi duyệt, nghĩa này được thêm vào từ “{initial.lemma}”; các nghĩa cũ vẫn như cũ.</li>
              <li><strong>Dùng một nghĩa ở trên:</strong> bài dùng nghĩa đó và bỏ “{initial.vietnameseMeaning}”; thư viện không đổi.</li>
            </ul> : null}
          </>
          : <p className="adm-muted">Từ này chưa có trong thư viện; nó được tạo khi duyệt bản nháp.</p>}
      </div> : null}
      <label className="adm-field"><span>Từ vựng<span aria-hidden="true" className="adm-required" /></span><input className="adm-input" disabled={readOnly} maxLength={100} onChange={(event) => set({ lemma: event.target.value })} value={word.lemma} /></label>
      <fieldset className="adm-pos">
        <legend>Loại từ<span aria-hidden="true" className="adm-required" /></legend>
        <div className="adm-band__chips">
          {COURSE_PARTS_OF_SPEECH.map((part) => <label className="adm-band__chip" key={part}>
            <input checked={word.partOfSpeech === part} disabled={readOnly} name={group} onChange={() => set({ partOfSpeech: part })} type="radio" value={part} />
            <span>{PART_OF_SPEECH_LABELS[part]}</span>
          </label>)}
        </div>
      </fieldset>
      <label className="adm-field"><span>Phiên âm</span><input className="adm-input" disabled={readOnly} maxLength={100} onChange={(event) => set({ ipa: event.target.value })} placeholder="/ˈflʌktʃueɪt/" value={word.ipa ?? ''} /></label>
      <label className="adm-field"><span>Định nghĩa tiếng Anh</span><textarea className="adm-textarea" disabled={readOnly} maxLength={1000} onChange={(event) => set({ englishDefinition: event.target.value })} value={word.englishDefinition ?? ''} /></label>
      <label className="adm-field"><span>Nghĩa tiếng Việt<span aria-hidden="true" className="adm-required" /></span><textarea className="adm-textarea" disabled={readOnly} maxLength={1000} onChange={(event) => set({ vietnameseMeaning: event.target.value })} value={word.vietnameseMeaning} /></label>
      <label className="adm-field"><span>Câu ví dụ<span aria-hidden="true" className="adm-required" /></span><textarea className="adm-textarea" disabled={readOnly} maxLength={1000} onChange={(event) => set({ exampleSentence: event.target.value })} value={word.exampleSentence} /></label>
      {!readOnly && onRemove ? <div><button className="adm-btn adm-btn--danger adm-btn--small" onClick={() => { onRemove(); close() }} type="button"><Trash2 aria-hidden="true" size={14} />Gỡ từ này</button></div> : null}
      <div className="adm-form-footer"><button className="adm-btn" onClick={close} type="button">Đóng</button>{readOnly ? null : <button className="adm-btn adm-btn--primary" type="submit">Lưu</button>}</div>
    </form>}
  </AdminModal>
}
