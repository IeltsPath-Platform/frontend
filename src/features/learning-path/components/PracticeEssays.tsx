import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, CircleAlert, ExternalLink, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { boldRuns, countWords, essaySections, joinSections } from '@/features/practice/writing/writingText'
import { learningApi, toApiError, userMessage, type ApiError } from '../api'
import { mapEssayGrade } from '../api/learningAdapters'
import { LOOKUP_MAX_CHARS, LOOKUP_TABS, lookupUrl, type LookupDirection } from '../placement/dictionaryLookup'
import { newRequestId } from '../lib/requestId'
import { reportApiError } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'
import type { EssayGrade, EssayStudyPoint, PracticeEssay } from '~types/learningPath'
import { PracticeEssayMaterial } from './PracticeEssayMaterial'
import { LoadingState } from './PageState'

import { CRITERION_NAME, JUDGMENT_LABEL } from './essayCriteria'
import { EssayStudyPoints } from './EssayStudyPoints'

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

/** Keep all submitted paragraphs, including any extra paragraphs in the final section. */
function submittedParts(text: string, sectionCount: number): string[] {
  const parts = text.trim().split(/\r?\n\s*\r?\n/)
  return Array.from({ length: sectionCount }, (_, index) =>
    index === sectionCount - 1 ? parts.slice(index).join('\n\n') : parts[index] ?? '')
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
  onPractise?: (point: EssayStudyPoint) => Promise<void>
}

/**
 * The workspace of the essays of a Practice set, laid out like the Writing practice: the prompt on the left, the
 * writing in the middle and the dictionary on the right, all on screen at once. Each essay is written, sent for
 * grading and answered with its bands, corrections and a summary. Grading costs points, so nothing is sent until the
 * learner presses the button.
 */
export function PracticeEssays({ attemptId, essays, onFinish, finished, onExit, done, onPractise }: PracticeEssaysProps) {
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
            onPractise={onPractise}
            total={essays.length}
          />
        ))}
      </div>
    </div>,
    document.body,
  )
}

function EssayEditor({ active, attemptId, essay, grade, index, locked, onGrade, onPractise, total }: {
  /** Only the essay in view is shown; the others keep what was written while they are out of view. */
  active: boolean
  attemptId: string
  essay: PracticeEssay
  grade: EssayGrade | null
  index: number
  locked: boolean
  onGrade: (grade: EssayGrade) => void
  onPractise?: (point: EssayStudyPoint) => Promise<void>
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
  // The right column is reserved for the dictionary and the result, so grading never moves the essay itself.
  const [railChoice, setRailChoice] = useState<'lookup' | 'result' | null>(null)
  const railRef = useRef<HTMLElement>(null)
  const freshlyGraded = useRef(false)
  const submissionId = !grade && gradedBefore(essay) ? essay.latest?.id : undefined
  const saved = useApiResource(`practice-essay:${attemptId}:${essay.id}:${submissionId ?? ''}`, async () =>
    submissionId ? learningApi.getWritingSubmission(submissionId) : null)
  const restored = saved.data?.status === 'GRADED' ? saved.data : null
  const displayedGrade = grade ?? (restored ? mapEssayGrade(restored) : null)
  const restoring = Boolean(submissionId)
  const visibleParagraphs = restoring ? submittedParts(restored?.essayText ?? '', sections.length) : paragraphs
  const missingText = restored !== null && !(restored.essayText ?? '').trim()

  const words = missingText ? restored.wordCount ?? 0 : countWords(joinSections(visibleParagraphs))
  const minWords = essay.minWords
  const shortBy = minWords !== null ? Math.max(0, minWords - words) : 0
  const graded = displayedGrade?.status === 'GRADED'
  // The sample comes with the essay; the graded submission carries it too, for a server that sends it only then.
  const sample = (essay.sampleAnswer ?? displayedGrade?.sampleAnswer ?? '').trim() || null
  const sampleDisabled = graded || gradedBefore(essay) || locked
  const showSample = !sampleDisabled && sampleOn && sample !== null
  const sampleParagraphs = (sample ?? '').split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const sampleParts = sampleParagraphs.length === sections.length ? sampleParagraphs : [sample ?? '']
  const title = essay.task ? `Đề viết · ${TASK_LABEL[essay.task]}` : 'Đề viết'

  // The result opens by itself once graded, until the learner picks the dictionary.
  const rail = graded ? railChoice ?? 'result' : 'lookup'

  useEffect(() => {
    // On a narrow screen the columns stack, so bring the result into view after a fresh grading only.
    if (graded && freshlyGraded.current) {
      freshlyGraded.current = false
      railRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
    }
  }, [graded])

  async function submit() {
    if (inFlight.current || graded || restoring || locked || text.trim() === '') return
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
      freshlyGraded.current = true
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
            <strong>{graded ? 'Bài viết đã nộp' : 'Viết bài'}</strong>
            {sample && !sampleDisabled ? (
              <label className="lp-essay-switch">
                <Switch aria-label="Bài mẫu" checked={showSample} disabled={sampleDisabled} onCheckedChange={setSampleOn} />
                <span>Bài mẫu</span>
              </label>
            ) : null}
          </div>
          <span aria-live="polite">Word count: {words}</span>
        </header>
        <div className="lp-ws-card__scroll">
          {restoring && saved.status === 'loading' ? <LoadingState label="Đang tải bài viết và kết quả chấm…" /> : null}
          {restoring && (saved.status === 'error' || (saved.status === 'success' && !restored)) ? (
            <div className="lp-error" role="alert">
              <p>Không tải được bài viết và kết quả chấm. {saved.error ? userMessage(saved.error) : 'Vui lòng thử lại.'}</p>
              <Button className="lp-btn" onClick={saved.reload} type="button">Thử lại</Button>
            </div>
          ) : null}
          {missingText ? <p className="lp-hint" role="status">Không có nội dung bài viết đã nộp để hiển thị.</p> : null}
          {(restoring && !restored) || (missingText && !showSample) ? null : (
            <div className="lp-essay-parts" role="group" aria-label={graded ? 'Bài viết đã nộp' : 'Bài viết của bạn'}>
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
                    readOnly={showSample || graded || locked}
                    spellCheck
                    value={showSample
                      ? boldRuns(sampleParts[partIndex] ?? '').map((run) => run.text).join('')
                      : visibleParagraphs[partIndex] ?? ''}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        {restoring || (locked && !graded) ? null : (
          <footer className="lp-ws-card__foot">
            {graded ? (
              <p className="lp-essay__count lp-essay__count--done">
                <CheckCircle2 aria-hidden="true" size={16} /> Đã nộp và chấm xong
              </p>
            ) : (
              <>
                <p className={`lp-essay__count${shortBy > 0 ? ' is-short' : ''}`}>
                  {shortBy > 0 ? `Còn thiếu ${shortBy} từ so với yêu cầu` : minWords !== null ? 'Đủ số từ' : ''}
                </p>
                <Button
                  className="lp-btn lp-btn--accent"
                  disabled={showSample || submitting || text.trim() === ''}
                  onClick={() => void submit()}
                  type="button"
                >
                  {submitting ? <Loader2 aria-hidden="true" className="lp-spin" /> : null}
                  {submitting ? 'Đang chấm bài…' : 'Nộp để chấm'}
                </Button>
                {submitting ? <p className="lp-hint lp-ws-card__note" role="status">Đang chấm, thường mất 10 đến 20 giây. Đừng đóng trang này.</p> : null}
                {error ? (
                  <p className="lp-error lp-ws-card__note" role="alert">
                    <CircleAlert aria-hidden="true" size={16} /> {error}
                  </p>
                ) : null}
              </>
            )}
          </footer>
        )}
      </section>

      <aside className="lp-ws-card lp-essay-ws__rail" aria-label="Từ điển và kết quả chấm" ref={railRef}>
        <header className="lp-ws-card__head">
          <div className="lp-segment" role="group" aria-label="Nội dung cột bên phải">
            <button aria-pressed={rail === 'lookup'} onClick={() => setRailChoice('lookup')} type="button">Từ điển</button>
            <button
              aria-pressed={rail === 'result'}
              disabled={!graded}
              onClick={() => setRailChoice('result')}
              title={graded ? undefined : 'Có sau khi bài được chấm'}
              type="button"
            >
              Kết quả chấm
            </button>
          </div>
        </header>
        <div className="lp-essay-ws__rail-pane" hidden={rail !== 'lookup'}>
          <EssayLookup />
        </div>
        <div className="lp-essay-ws__rail-pane" hidden={rail !== 'result'}>
          {graded && displayedGrade ? (
            <div className="lp-ws-card__scroll">
              <EssayResult grade={displayedGrade} passBand={essay.passBand} onPractise={onPractise} />
            </div>
          ) : null}
        </div>
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

function EssayResult({ grade, passBand, onPractise }: {
  grade: EssayGrade
  passBand: number | null
  onPractise?: (point: EssayStudyPoint) => Promise<void>
}) {
  const passed = grade.passed === true
  const gap = !passed && passBand !== null && grade.overallBand !== null ? passBand - grade.overallBand : null
  return (
    <section className={`lp-essay-result${passed ? ' is-passed' : ''}`} aria-label="Kết quả chấm bài">
      <div className="lp-essay-result__overall">
        <div>
          <p className="lp-essay-result__eyebrow">Kết quả chấm của AI</p>
          <p className="lp-essay-result__band">{bandText(grade.overallBand)}</p>
          <p className="lp-essay-result__band-label">Band tổng</p>
        </div>
        <div className="lp-essay-result__verdict-box">
          <p className="lp-essay-result__verdict" role="status">
            {passed ? 'Đạt' : `Chưa đạt${passBand !== null ? `, mục tiêu band ${passBand.toFixed(1)}` : ''}`}
          </p>
          {gap !== null && gap > 0 ? <p className="lp-essay-result__gap">Còn thiếu {gap.toFixed(1)} band</p> : null}
        </div>
      </div>

      {grade.summary ? <p className="lp-essay-result__summary">{grade.summary}</p> : null}

      <ul className="lp-essay-criteria" aria-label="Điểm từng tiêu chí">
        {grade.criteria.map((criterion) => {
          const weak = passBand !== null && criterion.band < passBand
          return (
            <li key={criterion.code}>
              <div className="lp-essay-criteria__head">
                <span>{CRITERION_NAME[criterion.code] ?? criterion.code}</span>
                <strong>{criterion.band.toFixed(1)}</strong>
              </div>
              <span className={`lp-essay-criteria__bar${weak ? ' is-weak' : ''}`} aria-hidden="true">
                <i style={{ width: `${Math.min(100, (criterion.band / 9) * 100)}%` }} />
                {passBand !== null ? <b style={{ left: `${Math.min(100, (passBand / 9) * 100)}%` }} /> : null}
              </span>
              {criterion.strengths.length > 0 || criterion.improvements.length > 0 ? (
                <ul className="lp-essay-criteria__notes">
                  {criterion.strengths.map((note) => <li className="is-good" key={`g-${note}`}>{note}</li>)}
                  {criterion.improvements.map((note) => <li key={`i-${note}`}>{note}</li>)}
                </ul>
              ) : null}
              {criterion.knowledgePointJudgments?.length ? (
                <ul
                  className="lp-essay-criteria__kps"
                  aria-label={`Kiến thức con của ${CRITERION_NAME[criterion.code] ?? criterion.code}`}
                >
                  {criterion.knowledgePointJudgments.map((item) => (
                    <li
                      className={`is-${item.judgment === 'PASS' ? 'good' : item.judgment === 'FAIL' ? 'weak' : 'neutral'}`}
                      key={item.knowledgePointId}
                    >
                      <span>{item.name ?? item.code ?? 'Điểm kiến thức'}</span>
                      <em>{JUDGMENT_LABEL[item.judgment]}</em>
                      {item.excerpt ? <q>{item.excerpt}</q> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
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
      <EssayStudyPoints points={grade.studyPoints} onPractise={onPractise} />
    </section>
  )
}
