import { useId, useState, type FormEvent } from 'react'
import { BookPlus, Pencil, Trash2 } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { useAdminResource } from '../../lib/useAdminResource'
import { findVocabularyByLemmas } from '../../lessons/api/lessonApi'
import { VocabularySensePicker } from '../../lessons/components/VocabularySensePicker'
import { PART_OF_SPEECH_LABELS } from '../lib/courseDraftLabels'
import { COURSE_NEW_WORD_LIMIT, COURSE_PARTS_OF_SPEECH, COURSE_VOCABULARY_LIMIT, courseNewWordSchema, type CourseLesson, type CourseNewWord } from '../types'
import '../../lessons/lessons.css'
import { useAdminError } from '../../lib/useAdminError'

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
    </div>
    {disabled
      ? <p className="adm-muted">{picked.length} nghĩa đã chọn từ thư viện.</p>
      : <VocabularySensePicker onChange={(next) => onChange({ ...value, vocabularySenseIds: next })} value={picked} />}

    <div className="adm-sec__head">
      <h5 className="adm-sec__title">Từ đề xuất<span className="adm-count">{words.length}/{COURSE_NEW_WORD_LIMIT}</span></h5>
      <button className="adm-btn adm-btn--small" disabled={disabled || full} onClick={() => setEditing({ index: null, word: EMPTY_WORD })} type="button"><BookPlus aria-hidden="true" size={14} />Thêm từ</button>
    </div>
    <small className="adm-muted">Từ chưa có trong thư viện sẽ được tạo khi duyệt bản nháp; từ đã có giữ nghĩa của thư viện.</small>
    <div className="adm-table-wrap adm-kp-table">
      <table aria-label="Từ vựng đề xuất của bài" className="adm-table">
        <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Từ</th><th scope="col">Loại từ</th><th scope="col">Nghĩa tiếng Việt</th><th scope="col">Thư viện</th><th scope="col">Hành động</th></tr></thead>
        <tbody>{words.length === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={6}>Chưa có từ đề xuất nào.</td></tr> : words.map((word, index) => {
          const sense = librarySense(word)
          return <tr key={`${word.lemma}-${index}`}>
            <td className="adm-stt">{index + 1}</td>
            <td><strong>{word.lemma}</strong></td>
            <td>{PART_OF_SPEECH_LABELS[word.partOfSpeech]}</td>
            <td>{word.vietnameseMeaning}</td>
            <td>{found.status === 'loading' ? <span className="adm-muted">Đang kiểm tra…</span>
              : found.status === 'error' ? <span className="adm-muted">Chưa kiểm tra được</span>
              : sense ? <span className="adm-badge adm-badge--ok">Đã có: {sense.vietnameseMeaning ?? sense.englishDefinition}</span>
              : <span className="adm-badge adm-badge--warn">Từ mới</span>}</td>
            <td><AdminRowMenu label={`Hành động của từ ${word.lemma}`} items={[
              { key: 'edit', label: 'Sửa', ariaLabel: `Sửa từ ${word.lemma}`, icon: <Pencil aria-hidden="true" size={14} />, disabled, onSelect: () => setEditing({ index, word }) },
              ...(sense ? [{ key: 'adopt', label: 'Dùng nghĩa có sẵn', ariaLabel: `Dùng nghĩa có sẵn của từ ${word.lemma}`, disabled, onSelect: () => adopt(index) }] : []),
              { key: 'remove', label: 'Gỡ', ariaLabel: `Gỡ từ ${word.lemma}`, icon: <Trash2 aria-hidden="true" size={14} />, tone: 'danger' as const, disabled, onSelect: () => onChange({ ...value, newVocabulary: words.filter((_, position) => position !== index) }) },
            ]} /></td>
          </tr>
        })}</tbody>
      </table>
    </div>
    {editing ? <WordDialog index={editing.index} initial={editing.word} others={words.filter((_, position) => position !== editing.index)} onClose={() => setEditing(null)} onSave={(word) => save(word, editing.index)} /> : null}
  </div>
}

/** Adds or edits one proposed word; the lemma may not repeat another word of the lesson. */
function WordDialog({ index, initial, others, onClose, onSave }: {
  index: number | null; initial: CourseNewWord; others: readonly CourseNewWord[]; onClose: () => void; onSave: (word: CourseNewWord) => void
}) {
  const [word, setWord] = useState<CourseNewWord>({ ...EMPTY_WORD, ...initial, ipa: initial.ipa ?? '', englishDefinition: initial.englishDefinition ?? '' })
  const [, setError] = useAdminError()
  const group = useId()
  const set = (patch: Partial<CourseNewWord>) => setWord((current) => ({ ...current, ...patch }))

  function submit(event: FormEvent, close: () => void) {
    event.preventDefault()
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

  return <AdminModal title={index === null ? 'Thêm từ vựng' : 'Sửa từ vựng'} onClose={onClose} stacked>
    {(close) => <form aria-label={index === null ? 'Thêm từ vựng' : 'Sửa từ vựng'} noValidate onSubmit={(event) => submit(event, close)}>
      <label className="adm-field"><span>Từ vựng<span aria-hidden="true" className="adm-required" /></span><input className="adm-input" maxLength={100} onChange={(event) => set({ lemma: event.target.value })} value={word.lemma} /></label>
      <fieldset className="adm-pos">
        <legend>Loại từ<span aria-hidden="true" className="adm-required" /></legend>
        <div className="adm-band__chips">
          {COURSE_PARTS_OF_SPEECH.map((part) => <label className="adm-band__chip" key={part}>
            <input checked={word.partOfSpeech === part} name={group} onChange={() => set({ partOfSpeech: part })} type="radio" value={part} />
            <span>{PART_OF_SPEECH_LABELS[part]}</span>
          </label>)}
        </div>
      </fieldset>
      <label className="adm-field"><span>Phiên âm</span><input className="adm-input" maxLength={100} onChange={(event) => set({ ipa: event.target.value })} placeholder="/ˈflʌktʃueɪt/" value={word.ipa ?? ''} /></label>
      <label className="adm-field"><span>Định nghĩa tiếng Anh</span><textarea className="adm-textarea" maxLength={1000} onChange={(event) => set({ englishDefinition: event.target.value })} value={word.englishDefinition ?? ''} /></label>
      <label className="adm-field"><span>Nghĩa tiếng Việt<span aria-hidden="true" className="adm-required" /></span><textarea className="adm-textarea" maxLength={1000} onChange={(event) => set({ vietnameseMeaning: event.target.value })} value={word.vietnameseMeaning} /></label>
      <label className="adm-field"><span>Câu ví dụ<span aria-hidden="true" className="adm-required" /></span><textarea className="adm-textarea" maxLength={1000} onChange={(event) => set({ exampleSentence: event.target.value })} value={word.exampleSentence} /></label>
      <div className="adm-form-footer"><button className="adm-btn" onClick={close} type="button">Đóng</button><button className="adm-btn adm-btn--primary" type="submit">Lưu</button></div>
    </form>}
  </AdminModal>
}
