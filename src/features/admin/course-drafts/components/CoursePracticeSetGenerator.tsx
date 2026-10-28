import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AdminModal } from '../../components/AdminLayer'
import { AdminLoading } from '../../components/AdminState'
import { getLessonVocabularySenses } from '@/features/learning-path/api/lessonVocabularyApi'
import { getPracticeSetDraft, requestPracticeSetDraft } from '../../ai-drafts/api/aiDraftApi'
import { useDraftPolling } from '../../ai-drafts/lib/useDraftPolling'
import {
  PRACTICE_SET_MAX_POINTS, PRACTICE_SET_MAX_QUESTIONS, PRACTICE_SET_MAX_VOCABULARY, PRACTICE_SET_MIN_QUESTIONS, PRACTICE_SET_QUESTION_TYPES,
  QUESTION_DIFFICULTIES,
} from '../../ai-drafts/types'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminError } from '../../lib/useAdminError'
import { DIFFICULTY_LABEL, TYPE_LABEL } from '../../questions/lib/labels'
import { elapsedText } from '../lib/elapsedText'
import { practiceSetOf } from '../lib/practiceSetOf'
import type { CoursePracticeSet } from '../types'

export interface GeneratorPoint { id: string; code: string; name: string }

const FAILURE_TEXT: Record<string, string> = {
  INVALID_REPLY: 'AI trả về nội dung chưa dùng được.',
  TIMEOUT: 'AI trả lời quá lâu.',
}

type Phase = { name: 'form' } | { name: 'waiting'; draftId: string; startedAt: number } | { name: 'failed'; code: string | null }

/**
 * Asks the model for one practice set on the knowledge points of a lesson. The author picks the points, the question
 * type, how many questions and how hard; the request is queued, so the dialog waits and asks again until the draft is
 * ready. Closing it while waiting gives up on the result; the use of the daily allowance is not given back for that.
 */
export function CoursePracticeSetGenerator({ lessonTitle, points, vocabularySenseIds, newWordLemmas, onGenerated, onClose }: {
  lessonTitle: string; points: readonly GeneratorPoint[]
  /** The lesson's words: senses picked from the library and the lemmas of the words proposed for it. The passage should use them. */
  vocabularySenseIds: readonly string[]; newWordLemmas: readonly string[]
  onGenerated: (set: CoursePracticeSet) => void; onClose: () => void
}) {
  const [phase, setPhase] = useState<Phase>({ name: 'form' })
  const [picked, setPicked] = useState<string[]>(() => points.slice(0, PRACTICE_SET_MAX_POINTS).map((point) => point.id))
  const [questionType, setQuestionType] = useState<(typeof PRACTICE_SET_QUESTION_TYPES)[number]>('MULTIPLE_CHOICE')
  const [count, setCount] = useState(5)
  const [difficulty, setDifficulty] = useState<(typeof QUESTION_DIFFICULTIES)[number]>('MEDIUM')
  const [submitting, setSubmitting] = useState(false)
  const [, setError] = useAdminError()
  const [now, setNow] = useState(() => Date.now())

  const waitingFor = phase.name === 'waiting' ? phase.draftId : null
  // The callbacks change on every render of the parent; the check must not, or its timer would restart every second.
  const latest = useRef({ onGenerated, onClose })
  useEffect(() => { latest.current = { onGenerated, onClose } })
  const check = useCallback(() => {
    if (!waitingFor) return
    void getPracticeSetDraft(waitingFor).then((draft) => {
      if (draft.status === 'READY') {
        const set = practiceSetOf(draft)
        if (set) { latest.current.onGenerated(set); latest.current.onClose() } else setPhase({ name: 'failed', code: 'INVALID_REPLY' })
      } else if (draft.status === 'FAILED' || draft.status === 'REJECTED') {
        setPhase({ name: 'failed', code: draft.errorCode })
      }
    }).catch(() => undefined) // a missed check is retried on the next one
  }, [waitingFor])
  useDraftPolling(waitingFor !== null, check)
  useEffect(() => {
    if (!waitingFor) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [waitingFor])

  const toggle = (id: string) => setPicked((current) => current.includes(id) ? current.filter((item) => item !== id)
    : current.length < PRACTICE_SET_MAX_POINTS ? [...current, id] : current)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (picked.length === 0) { setError('Chọn ít nhất một điểm kiến thức.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const library = await getLessonVocabularySenses(vocabularySenseIds)
      const words = [...library.map((card) => card.lemma), ...newWordLemmas].map((lemma) => lemma.trim()).filter(Boolean)
      // The library and the proposed words can name the same word; it is sent once, as the first spelling.
      const seen = new Set<string>()
      const vocabulary = words.filter((word) => !seen.has(word.toLowerCase()) && seen.add(word.toLowerCase())).slice(0, PRACTICE_SET_MAX_VOCABULARY)
      const draft = await requestPracticeSetDraft({ knowledgePointIds: picked, lessonTitle: lessonTitle.trim() || null, vocabulary, questionType, count, difficulty })
      setPhase({ name: 'waiting', draftId: draft.id, startedAt: Date.now() })
      setNow(Date.now())
    } catch (reason) {
      setError(adminErrorMessage(reason))
    } finally {
      setSubmitting(false)
    }
  }

  return <AdminModal title="Tạo gói luyện bằng AI" stacked onClose={onClose}>
    {(close) => {
      if (phase.name === 'waiting') return <div className="adm-pkg-wait">
        <AdminLoading label={`AI đang viết gói luyện… ${elapsedText((now - phase.startedAt) / 1000)}`} />
        <small className="adm-muted">Thường mất vài chục giây. Giữ hộp thoại này mở để nhận kết quả.</small>
        <div className="adm-form-footer"><button className="adm-btn" onClick={close} type="button">Đóng</button></div>
      </div>
      if (phase.name === 'failed') return <div className="adm-pkg-wait">
        <p role="alert">{(phase.code && FAILURE_TEXT[phase.code]) ?? 'Không tạo được gói luyện.'} Lượt dùng đã được hoàn lại, bạn có thể thử lại.</p>
        <div className="adm-form-footer"><button className="adm-btn" onClick={close} type="button">Đóng</button>
          <button className="adm-btn adm-btn--primary adm-btn--noicon" onClick={() => setPhase({ name: 'form' })} type="button">Thử lại</button></div>
      </div>
      return <form aria-label="Tạo gói luyện bằng AI" noValidate onSubmit={(event) => void submit(event)}>
        <fieldset className="adm-pos">
          <legend>Điểm kiến thức<span aria-hidden="true" className="adm-required" /></legend>
          <div className="adm-pkg-points">{points.map((point) => <label className="adm-kp-card" key={point.id}>
            <input checked={picked.includes(point.id)} disabled={!picked.includes(point.id) && picked.length >= PRACTICE_SET_MAX_POINTS} onChange={() => toggle(point.id)} type="checkbox" />
            <span className="adm-kp-card__text"><span className="adm-kp-card__title">{point.name}</span><small><code>{point.code}</code></small></span>
          </label>)}</div>
        </fieldset>
        <fieldset className="adm-pos">
          <legend>Dạng câu<span aria-hidden="true" className="adm-required" /></legend>
          <div className="adm-band__chips">{PRACTICE_SET_QUESTION_TYPES.map((type) => <label className="adm-band__chip" key={type}>
            <input checked={questionType === type} name="practice-set-type" onChange={() => setQuestionType(type)} type="radio" value={type} />
            <span>{TYPE_LABEL[type] ?? type}</span>
          </label>)}</div>
        </fieldset>
        <div className="adm-course-draft-grid">
          <label className="adm-field"><span>Số câu</span>
            <select className="adm-select" onChange={(event) => setCount(Number(event.target.value))} value={count}>
              {Array.from({ length: PRACTICE_SET_MAX_QUESTIONS - PRACTICE_SET_MIN_QUESTIONS + 1 }, (_, index) => PRACTICE_SET_MIN_QUESTIONS + index)
                .map((value) => <option key={value} value={value}>{value}</option>)}
            </select></label>
          <label className="adm-field"><span>Độ khó</span>
            <select className="adm-select" onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} value={difficulty}>
              {QUESTION_DIFFICULTIES.map((value) => <option key={value} value={value}>{DIFFICULTY_LABEL[value] ?? value}</option>)}
            </select></label>
        </div>
        <div className="adm-form-footer"><button className="adm-btn" onClick={close} type="button">Đóng</button>
          <button className="adm-btn adm-btn--primary adm-btn--noicon" disabled={submitting} type="submit">Tạo gói</button></div>
      </form>
    }}
  </AdminModal>
}
