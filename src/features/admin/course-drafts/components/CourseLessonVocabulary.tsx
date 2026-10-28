import { useId, useState, type FormEvent } from 'react'
import { BookPlus, Eye, Library, Trash2, X } from 'lucide-react'
import { getLessonVocabularySenses } from '@/features/learning-path/api/lessonVocabularyApi'
import { AdminModal } from '../../components/AdminLayer'
import { useAdminResource } from '../../lib/useAdminResource'
import { findVocabularyByLemmas, type VocabularyHit } from '../../lessons/api/lessonApi'
import { PART_OF_SPEECH_LABELS } from '../lib/courseDraftLabels'
import { COURSE_NEW_WORD_LIMIT, COURSE_PARTS_OF_SPEECH, COURSE_VOCABULARY_LIMIT, courseNewWordSchema, type CourseLesson, type CourseNewWord } from '../types'
import '../../lessons/lessons.css'
import { useAdminError } from '../../lib/useAdminError'
import { VocabularyLibraryDialog } from './VocabularyLibraryDialog'

const EMPTY_WORD: CourseNewWord = { lemma: '', ipa: '', partOfSpeech: 'NOUN', englishDefinition: '', vietnameseMeaning: '', exampleSentence: '' }
const key = (lemma: string) => lemma.trim().toLowerCase()

/**
 * The vocabulary of a lesson: senses already in the library, picked by search, and the words the model proposed. A
 * proposed word is reviewed here and only written to the library when the draft is approved; one the library already
 * has keeps its own sense, which the author may adopt right away.
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
  const librarySense = (word: CourseNewWord) => library.get(key(word.lemma))?.senses?.find((sense) => sense.status !== 'INACTIVE')

  /** The library's own sense replaces the proposal, so the lesson does not carry the same word twice. */
  function adopt(index: number) {
    const sense = librarySense(words[index]!)
    if (!sense) return
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
              <td>{card || cards.status === 'loading' ? <span className="adm-badge adm-badge--ok">Đã có</span> : <span className="adm-badge adm-badge--warn">Không còn khả dụng</span>}</td>
              <td className="adm-kp-table__remove adm-qrow__tools">
                <button aria-label={`Bỏ từ ${card?.lemma ?? id}`} disabled={disabled} onClick={() => onChange({ ...value, vocabularySenseIds: picked.filter((item) => item !== id) })} type="button"><X aria-hidden="true" size={16} /></button>
              </td>
            </tr>
          })}
          {words.map((word, index) => {
          const sense = librarySense(word)
          return <tr key={`${word.lemma}-${index}`}>
            <td className="adm-stt">{picked.length + index + 1}</td>
            <td><strong>{word.lemma}</strong></td>
            <td>{PART_OF_SPEECH_LABELS[word.partOfSpeech]}</td>
            <td>{word.vietnameseMeaning}</td>
            <td>{word.exampleSentence}</td>
            <td>{found.status === 'loading' ? <span className="adm-muted">Đang kiểm tra…</span>
              : found.status === 'error' ? <span className="adm-muted">Chưa kiểm tra được</span>
              : sense ? <span className="adm-badge adm-badge--ok">Đã có: {sense.vietnameseMeaning ?? sense.englishDefinition}</span>
              : <span className="adm-badge adm-badge--warn">Từ mới</span>}</td>
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
      librarySense={editing.index === null ? undefined : librarySense(editing.word)}
      onAdopt={editing.index === null ? undefined : () => adopt(editing.index!)}
      onRemove={editing.index === null ? undefined : () => onChange({ ...value, newVocabulary: words.filter((_, position) => position !== editing.index) })}
      onClose={() => setEditing(null)} onSave={(word) => save(word, editing.index)} /> : null}
  </div>
}

type LibrarySense = NonNullable<VocabularyHit['senses']>[number]

/**
 * One proposed word: adds a new one, or shows an existing one with what the library holds for it. The fields are
 * read-only when the draft cannot be edited; otherwise the word can be saved, removed or swapped for the library's
 * sense. The lemma may not repeat another word of the lesson.
 */
function WordDialog({ index, initial, others, readOnly, librarySense, onAdopt, onRemove, onClose, onSave }: {
  index: number | null; initial: CourseNewWord; others: readonly CourseNewWord[]; readOnly: boolean; librarySense?: LibrarySense
  onAdopt?: () => void; onRemove?: () => void; onClose: () => void; onSave: (word: CourseNewWord) => void
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
        {librarySense
          ? <>
            <p><strong>{librarySense.vietnameseMeaning ?? librarySense.englishDefinition}</strong></p>
            {librarySense.exampleSentence ? <p className="adm-muted">{librarySense.exampleSentence}</p> : null}
            <small className="adm-muted">Khi duyệt bản nháp, nghĩa này được dùng thay cho nghĩa đề xuất bên dưới.</small>
            {!readOnly && onAdopt ? <div><button className="adm-btn adm-btn--small" onClick={() => { onAdopt(); close() }} type="button">Dùng nghĩa có sẵn</button></div> : null}
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
