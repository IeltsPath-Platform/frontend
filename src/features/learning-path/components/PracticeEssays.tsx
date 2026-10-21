import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, CircleAlert, ExternalLink, Loader2, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { boldRuns, countWords, essaySections, joinSections } from '@/features/practice/writing/writingText'
import { learningApi, toApiError, userMessage, type ApiError } from '../api'
import { LOOKUP_MAX_CHARS, LOOKUP_TABS, lookupUrl, type LookupDirection } from '../placement/dictionaryLookup'
import { newRequestId } from '../lib/requestId'
import { reportApiError } from '../lib/reviewGate'
import type { EssayGrade, PracticeEssay } from '~types/learningPath'
import { EssaySampleText } from './EssaySampleText'
import { PracticeEssayMaterial } from './PracticeEssayMaterial'

const CRITERION_NAME: Record<string, string> = {
  TA: 'Task Achievement',
  TR: 'Task Response',
  CC: 'Coherence & Cohesion',
  LR: 'Lexical Resource',
  GRA: 'Grammar Range & Accuracy',
}

const TASK_LABEL: Record<string, string> = { TASK_1: 'Task 1', TASK_2: 'Task 2' }

/** What went wrong with a grading request and what the learner can do about it. Nothing is charged on any of these. */
function gradingMessage(error: ApiError): string {
  switch (error.code) {
    case 'INSUFFICIENT_POINTS':
      return 'Bạn chưa đủ điểm để chấm bài viết. Chưa có điểm nào bị trừ.'
    case 'GRADING_UNAVAILABLE':
      return 'Hệ thống chấm bài đang bận. Bài viết của bạn vẫn còn đây và chưa bị trừ điểm, hãy thử lại sau ít phút.'
    case 'DAILY_LIMIT_REACHED':
      return 'Bạn đã dùng hết lượt chấm bài viết hôm nay. Hãy quay lại vào ngày mai.'
    default:
      return userMessage(error)
  }
}

const bandText = (band: number | null) => (band === null ? '–' : band.toFixed(1))

/** An essay of the set that already has a graded submission from an earlier visit. */
function gradedBefore(essay: PracticeEssay) {
  return essay.latest?.status === 'GRADED'
}

interface PracticeEssaysProps {
  attemptId: string
  essays: PracticeEssay[]
  /** Hands the set in once every essay has a grade; resolves when the server has taken it. */
  onFinish: () => Promise<void>
  /** The set was handed in: the essays can no longer be changed. */
  finished: boolean
  /** Leaves the workspace without handing the set in. */
  onExit: () => void
  /** Shown in the top bar once the set was handed in, in place of the finish button. */
  done?: ReactNode
}

/**
 * The workspace of the essays of a Practice set, laid out like the Writing practice: the prompt on the left, the
 * writing in the middle and the dictionary on the right, all on screen at once. Each essay is written, sent for
 * grading and answered with its bands, corrections and a summary. Grading costs points, so nothing is sent until the
 * learner presses the button.
 */
export function PracticeEssays({ attemptId, essays, onFinish, finished, onExit, done }: PracticeEssaysProps) {
  const [grades, setGrades] = useState<Record<string, EssayGrade>>({})
  const [current, setCurrent] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)

  useEffect(() => {
    const root = document.documentElement
    const previousRootOverflow = root.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    root.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    return () => {
      root.style.overflow = previousRootOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [])

  const allGraded = essays.every((essay) => grades[essay.id]?.status === 'GRADED' || gradedBefore(essay))
  const gradedCount = essays.filter((essay) => grades[essay.id]?.status === 'GRADED' || gradedBefore(essay)).length

  async function finish() {
    setFinishing(true)
    setFinishError(null)
    try {
      await onFinish()
    } catch (reason) {
      setFinishError(userMessage(toApiError(reason)))
    } finally {
      setFinishing(false)
    }
  }

  return createPortal(
    <div className="lp-tokens lp-essay-ws" role="region" aria-label="Làm bài viết">
      <header className="lp-essay-ws__bar">
        <button aria-label="Thoát bài viết" className="lp-essay-ws__exit" onClick={onExit} type="button">
          <X aria-hidden="true" size={16} />
        </button>
        {essays.length > 1 ? (
          <div className="lp-segment" role="group" aria-label="Chọn đề viết">
            {essays.map((essay, index) => (
              <button aria-pressed={index === current} key={essay.id} onClick={() => setCurrent(index)} type="button">
                Đề {index + 1}
              </button>
            ))}
          </div>
        ) : null}
        <div className="lp-essay-ws__finish">
          {finished ? done : (
            <>
              <p>
                {allGraded
                  ? 'Đã chấm xong. Hoàn thành để ghi nhận bộ luyện tập.'
                  : `Đã chấm ${gradedCount}/${essays.length} bài viết`}
              </p>
              <Button
                className="lp-btn lp-btn--accent"
                disabled={!allGraded || finishing}
                onClick={() => void finish()}
                type="button"
              >
                {finishing ? <Loader2 aria-hidden="true" className="lp-spin" /> : <CheckCircle2 aria-hidden="true" size={16} />}
                {finishing ? 'Đang ghi nhận…' : 'Hoàn thành bộ luyện tập'}
              </Button>
            </>
          )}
        </div>
        {finishError ? <p className="lp-error lp-essay-ws__error" role="alert">{finishError}</p> : null}
      </header>
      <div className="lp-essay-ws__body">
        {essays.map((essay, index) => (
          <EssayEditor
            active={index === current}
            attemptId={attemptId}
            essay={essay}
            grade={grades[essay.id] ?? null}
            index={index}
            key={essay.id}
            locked={finished}
            onGrade={(grade) => setGrades((previous) => ({ ...previous, [essay.id]: grade }))}
            total={essays.length}
          />
        ))}
      </div>
    </div>,
    document.body,
  )
}

function EssayEditor({ active, attemptId, essay, grade, index, locked, onGrade, total }: {
  /** Only the essay in view is shown; the others keep what was written while they are out of view. */
  active: boolean
  attemptId: string
  essay: PracticeEssay
  grade: EssayGrade | null
  index: number
  locked: boolean
  onGrade: (grade: EssayGrade) => void
  total: number
}) {
  const sections = essaySections(essay.task)
  const [paragraphs, setParagraphs] = useState<string[]>(() => sections.map(() => ''))
  const text = joinSections(paragraphs)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The same id is kept while the text is unchanged, so retrying after a failure is graded and charged once.
  const pending = useRef<{ requestId: string; text: string } | null>(null)
  const inFlight = useRef(false)
  const [sampleOn, setSampleOn] = useState(false)

  const words = countWords(text)
  const minWords = essay.minWords
  const shortBy = minWords !== null ? Math.max(0, minWords - words) : 0
  const graded = grade?.status === 'GRADED'
  // The sample comes with the essay; the graded submission carries it too, for a server that sends it only then.
  const sample = (essay.sampleAnswer ?? grade?.sampleAnswer ?? '').trim() || null
  const showSample = sampleOn && sample !== null
  const sampleParagraphs = (sample ?? '').split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const sampleParts = sampleParagraphs.length === sections.length ? sampleParagraphs : [sample ?? '']
  const title = essay.task ? `Đề viết · ${TASK_LABEL[essay.task]}` : 'Đề viết'

  async function submit() {
    if (inFlight.current || text.trim() === '') return
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    if (!pending.current || pending.current.text !== text) pending.current = { requestId: newRequestId(), text }
    try {
      const result = await learningApi.submitPracticeEssay(attemptId, essay.id, {
        requestId: pending.current.requestId,
        essayText: text,
      })
      pending.current = null
      onGrade(result)
    } catch (reason) {
      const apiError = toApiError(reason)
      reportApiError(apiError)
      setError(gradingMessage(apiError))
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <article className="lp-essay-ws__cols" hidden={!active} aria-label={`${title}${total > 1 ? ` ${index + 1}/${total}` : ''}`}>
      <PracticeEssayMaterial essay={essay} title={title} />

      <section className="lp-ws-card lp-essay-ws__write" aria-label="Khu vực viết bài">
        <header className="lp-ws-card__head lp-essay-editor__head">
          <div className="lp-essay-ws__title">
            <strong>Viết bài</strong>
            {sample ? (
              <label className="lp-essay-switch">
                <Switch aria-label="Bài mẫu" checked={sampleOn} onCheckedChange={setSampleOn} />
                <span>Bài mẫu</span>
              </label>
            ) : null}
          </div>
          <span aria-live="polite">Word count: {words}</span>
        </header>
        <div className="lp-ws-card__scroll">
          {gradedBefore(essay) && !grade ? (
            <p className="lp-hint" role="status">
              Bạn đã được chấm bài này: band {bandText(essay.latest?.overallBand ?? null)}
              {essay.latest?.passed ? ', đạt.' : ', chưa đạt.'} Viết lại nếu muốn chấm thêm một lần.
            </p>
          ) : null}
          {graded && grade ? <EssayResult grade={grade} passBand={essay.passBand} /> : null}
          {locked && showSample ? <EssaySampleText sample={sample} task={essay.task} /> : null}
          {locked ? null : (
            <div className="lp-essay-parts" role="group" aria-label={graded ? 'Sửa bài viết để chấm lại' : 'Bài viết của bạn'}>
              {sections.map((section, partIndex) => (
                <div className="lp-essay-part" key={section}>
                  <label className="lp-essay__label" htmlFor={`essay-${essay.id}-${partIndex}`}>{section}</label>
                  <textarea
                    className={`lp-essay__text${showSample ? ' lp-essay__text--sample' : ''}`}
                    disabled={submitting}
                    id={`essay-${essay.id}-${partIndex}`}
                    onChange={(event) => setParagraphs((previous) => previous.map((paragraph, paragraphIndex) =>
                      paragraphIndex === partIndex ? event.target.value : paragraph))}
                    placeholder={`Viết phần ${section} của bạn ở đây…`}
                    readOnly={showSample}
                    spellCheck
                    value={showSample
                      ? boldRuns(sampleParts[partIndex] ?? '').map((run) => run.text).join('')
                      : paragraphs[partIndex] ?? ''}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        {locked ? null : (
          <footer className="lp-ws-card__foot">
            <p className={`lp-essay__count${shortBy > 0 ? ' is-short' : ''}`}>
              {shortBy > 0 ? `Còn thiếu ${shortBy} từ so với yêu cầu` : minWords !== null ? 'Đủ số từ' : ''}
            </p>
            <Button
              className="lp-btn lp-btn--accent"
              disabled={showSample || submitting || text.trim() === ''}
              onClick={() => void submit()}
              type="button"
            >
              {submitting ? <Loader2 aria-hidden="true" className="lp-spin" /> : graded ? <RotateCcw aria-hidden="true" size={16} /> : null}
              {submitting ? 'Đang chấm bài…' : graded ? 'Chấm lại' : 'Nộp để chấm'}
            </Button>
            {submitting ? <p className="lp-hint lp-ws-card__note" role="status">Đang chấm, thường mất 10 đến 20 giây. Đừng đóng trang này.</p> : null}
            {error ? (
              <p className="lp-error lp-ws-card__note" role="alert">
                <CircleAlert aria-hidden="true" size={16} /> {error}
              </p>
            ) : null}
          </footer>
        )}
      </section>

      <aside className="lp-ws-card lp-essay-ws__dictionary" aria-label="Tra từ vựng">
        <header className="lp-ws-card__head">
          <strong>Tra từ vựng</strong>
        </header>
        <EssayLookup />
      </aside>
    </article>
  )
}

/** Looks a word up while writing. The result opens on Wiktionary in a new tab, so the essay is never interrupted. */
function EssayLookup() {
  const [direction, setDirection] = useState<LookupDirection>('vi-en')
  const [term, setTerm] = useState('')
  const [history, setHistory] = useState<Array<{ direction: LookupDirection; term: string }>>([])
  const current = LOOKUP_TABS.find((candidate) => candidate.id === direction) ?? LOOKUP_TABS[0]

  function search(event: FormEvent) {
    event.preventDefault()
    const value = term.trim()
    if (!value) return
    window.open(lookupUrl(direction, value), '_blank', 'noopener,noreferrer')
    setHistory((previous) => [
      { direction, term: value },
      ...previous.filter((entry) => entry.term !== value || entry.direction !== direction),
    ].slice(0, 8))
  }

  return (
    <>
      <div className="lp-ws-card__scroll">
        {history.length === 0 ? (
          <p className="lp-lookup__empty">
            Nhập từ cần tra bên dưới. Kết quả mở ở tab mới nên bài viết của bạn không bị gián đoạn.
          </p>
        ) : (
          <ul className="lp-lookup__history" aria-label="Các từ đã tra">
            {history.map((entry) => (
              <li key={`${entry.direction}-${entry.term}`}>
                <a href={lookupUrl(entry.direction, entry.term)} rel="noopener noreferrer" target="_blank">
                  <strong>{entry.term}</strong>
                  <small>{entry.direction === 'vi-en' ? 'Việt → Anh' : 'Anh → Việt'}</small>
                  <ExternalLink aria-hidden="true" size={14} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form className="lp-lookup" onSubmit={search}>
        <div className="lp-lookup__tabs" role="tablist" aria-label="Chiều tra từ">
          {LOOKUP_TABS.map((candidate) => (
            <button
              aria-selected={candidate.id === direction}
              key={candidate.id}
              onClick={() => setDirection(candidate.id)}
              role="tab"
              type="button"
            >
              {candidate.label}
            </button>
          ))}
        </div>
        <input
          aria-label="Từ cần tra"
          className="lp-lookup__input"
          maxLength={LOOKUP_MAX_CHARS}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={current.placeholder}
          value={term}
        />
        <div className="lp-lookup__foot">
          <span>{term.length}/{LOOKUP_MAX_CHARS} ký tự</span>
          <Button className="lp-btn lp-btn--accent" disabled={!term.trim()} type="submit">Tra từ vựng</Button>
        </div>
      </form>
    </>
  )
}

function EssayResult({ grade, passBand }: { grade: EssayGrade; passBand: number | null }) {
  const passed = grade.passed === true
  return (
    <section className={`lp-essay-result${passed ? ' is-passed' : ''}`} aria-label="Kết quả chấm bài">
      <div className="lp-essay-result__overall">
        <div>
          <p className="lp-essay-result__band">{bandText(grade.overallBand)}</p>
          <p className="lp-essay-result__band-label">Band tổng</p>
        </div>
        <p className="lp-essay-result__verdict" role="status">
          {passed ? 'Đạt' : `Chưa đạt${passBand !== null ? `, mục tiêu band ${passBand.toFixed(1)}` : ''}`}
        </p>
      </div>

      {grade.summary ? <p className="lp-essay-result__summary">{grade.summary}</p> : null}

      <ul className="lp-essay-criteria" aria-label="Điểm từng tiêu chí">
        {grade.criteria.map((criterion) => (
          <li key={criterion.code}>
            <div className="lp-essay-criteria__head">
              <span>{CRITERION_NAME[criterion.code] ?? criterion.code}</span>
              <strong>{criterion.band.toFixed(1)}</strong>
            </div>
            <span className="lp-essay-criteria__bar" aria-hidden="true">
              <i style={{ width: `${Math.min(100, (criterion.band / 9) * 100)}%` }} />
            </span>
            {criterion.strengths.length > 0 || criterion.improvements.length > 0 ? (
              <ul className="lp-essay-criteria__notes">
                {criterion.strengths.map((note) => <li className="is-good" key={`g-${note}`}>{note}</li>)}
                {criterion.improvements.map((note) => <li key={`i-${note}`}>{note}</li>)}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      {grade.corrections.length > 0 ? (
        <div className="lp-essay-corrections">
          <h4>Chỗ cần sửa</h4>
          <ul>
            {grade.corrections.map((correction) => (
              <li key={`${correction.excerpt}-${correction.suggestion}`}>
                <del>{correction.excerpt}</del>
                <ins>{correction.suggestion}</ins>
                {correction.category ? <small>{correction.category}</small> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
