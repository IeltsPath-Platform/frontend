import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CloudOff, Infinity as InfinityIcon, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AnswerMap } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { AudioBlock } from '../components/blocks/AudioBlock'
import { PassageBlock } from '../components/blocks/PassageBlock'
import { QuestionField } from '../components/blocks/QuestionField'
import { UnsupportedBlock } from '../components/blocks/UnsupportedBlock'
import { ApiErrorState, LoadingState } from '../components/PageState'
import { parseAttemptStructure, type TestItem, type TestSection } from '../lib/attemptSnapshot'
import { reportApiError } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'

type SaveState = 'saving' | 'saved' | 'error'

export function TopicTestPage() {
  const { attemptId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const topicId = searchParams.get('topic')
  const courseId = searchParams.get('course')
  const resource = useApiResource(`attempt:${attemptId}`, async () => parseAttemptStructure(await learningApi.getAttemptStructure(attemptId)))

  if (resource.status === 'loading') return <LoadingState label="Đang tải đề…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  if (!resource.data) return null
  return (
    <TestRunner
      attemptId={attemptId}
      courseId={courseId}
      key={attemptId}
      sections={resource.data}
      topicId={topicId}
    />
  )
}

function TestRunner({
  attemptId,
  sections,
  topicId,
  courseId,
}: {
  attemptId: string
  sections: TestSection[]
  topicId: string | null
  courseId: string | null
}) {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savedValues = useRef<AnswerMap>({})
  const revisions = useRef<Record<string, number>>({})
  const queues = useRef<Record<string, Promise<boolean>>>({})
  const inFlight = useRef(false)
  const mounted = useRef(true)
  // Strict Mode re-runs effect cleanup+setup on the same instance; reset so async
  // saves/submit can still update UI after the simulated cleanup.
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const answerable = sections.flatMap((section) => section.items).filter((item) => item.question !== null)
  const answeredCount = answerable.filter((item) => (answers[item.id] ?? '').trim()).length
  const unanswered = answerable.length - answeredCount
  const section = sections[active]
  const backPath = topicId
    ? `/learn/topics/${topicId}`
    : courseId
      ? `/learn/courses/${courseId}`
      : '/learn'
  const resultQuery = topicId
    ? `?topic=${topicId}`
    : courseId
      ? `?course=${courseId}`
      : ''

  function saveAnswer(itemId: string, rawValue: string): Promise<boolean> {
    const value = rawValue.trim()
    const run = async () => {
      if (!value || savedValues.current[itemId] === value) return true
      if (mounted.current) setSaveStates((current) => ({ ...current, [itemId]: 'saving' }))
      try {
        const response = await learningApi.saveItemResponse(attemptId, itemId, {
          payload: JSON.stringify({ answer: value }),
          schemaVersion: 1,
          expectedRevision: revisions.current[itemId] ?? 0,
        })
        revisions.current[itemId] = response.revision
        savedValues.current[itemId] = value
        if (mounted.current) setSaveStates((current) => ({ ...current, [itemId]: 'saved' }))
        return true
      } catch (reason) {
        reportApiError(toApiError(reason))
        if (mounted.current) setSaveStates((current) => ({ ...current, [itemId]: 'error' }))
        return false
      }
    }
    const next = (queues.current[itemId] ?? Promise.resolve(true)).then(run)
    queues.current[itemId] = next
    return next
  }

  function changeAnswer(item: TestItem, value: string) {
    setAnswers((current) => ({ ...current, [item.id]: value }))
    setConfirming(false)
    if (item.question?.options) void saveAnswer(item.id, value)
  }

  async function submit() {
    if (inFlight.current) return
    if (unanswered > 0 && !confirming) {
      setConfirming(true)
      return
    }
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    const fail = (message: string) => {
      if (!mounted.current) return
      setError(message)
      inFlight.current = false
      setSubmitting(false)
    }
    const saved = await Promise.all(answerable.map((item) => saveAnswer(item.id, answers[item.id] ?? '')))
    if (saved.includes(false)) {
      fail('Chưa lưu được một số câu trả lời. Kiểm tra các câu có cảnh báo rồi nộp lại.')
      return
    }
    try {
      await learningApi.submitAttempt(attemptId)
      navigate(`/learn/tests/${attemptId}/result${resultQuery}`, { replace: true })
    } catch (reason) {
      const apiError = toApiError(reason)
      reportApiError(apiError)
      fail(`${apiError.message} Hãy thử nộp lại.`)
    }
  }

  if (sections.length === 0 || !section) return <p className="lp-empty">Đề này chưa có câu hỏi.</p>

  return (
    <article className="lp-page lp-test-page" aria-labelledby="lp-test-title">
      <Link className="lp-back" to={backPath}>
        <ArrowLeft aria-hidden="true" size={16} />
        {courseId ? 'Về khóa học' : 'Về topic'}
      </Link>
      <header className="lp-test-head">
        <div>
          <p className="lp-eyebrow">{courseId ? 'Thi cuối khóa' : 'Bài kiểm tra cuối'}</p>
          <h1 id="lp-test-title">Làm từng phần, câu trả lời được lưu ngay</h1>
        </div>
        <p className="lp-test-head__meta"><InfinityIcon aria-hidden="true" size={18} />Không giới hạn thời gian</p>
      </header>

      <nav className="lp-sections" aria-label="Các phần của đề">
        {sections.map((candidate, index) => {
          const items = candidate.items.filter((item) => item.question !== null)
          const done = items.filter((item) => (answers[item.id] ?? '').trim()).length
          return (
            <button aria-current={index === active ? 'step' : undefined} className="lp-sections__tab" key={candidate.id} onClick={() => setActive(index)} type="button">
              <span>Phần {index + 1}</span>
              <small>{done}/{items.length} câu</small>
            </button>
          )
        })}
      </nav>

      <section className="lp-split lp-split--test" aria-label={`Phần ${active + 1}`} key={section.id}>
        <div className="lp-split__passage">
          {section.snapshot?.audio ? <AudioBlock audio={section.snapshot.audio} title={section.snapshot.title} /> : null}
          {section.snapshot?.passage && (section.snapshot.passage.paragraphs.length > 0 || section.snapshot.passage.title) ? (
            <PassageBlock passage={section.snapshot.passage} />
          ) : null}
          {!section.snapshot?.audio && !(section.snapshot?.passage && (section.snapshot.passage.paragraphs.length > 0 || section.snapshot.passage.title)) ? (
            <UnsupportedBlock block={{ id: section.id, sortOrder: section.sortOrder, type: 'SECTION' }} />
          ) : null}
        </div>
        <div className="lp-split__work">
          <div className="lp-exercise">
            <header className="lp-exercise__head">
              <div>
                <p className="lp-eyebrow">Phần {active + 1}/{sections.length}</p>
                <h2>{section.snapshot?.title ?? 'Câu hỏi'}</h2>
              </div>
            </header>
            {section.snapshot?.instructions ? <p className="lp-exercise__instructions">{section.snapshot.instructions}</p> : null}
            <ol className="lp-questions">
              {section.items.map((item) => (
                <li key={item.id}>
                  {item.question ? (
                    <>
                      <QuestionField
                        disabled={submitting}
                        onBlur={() => void saveAnswer(item.id, answers[item.id] ?? '')}
                        onChange={(value) => changeAnswer(item, value)}
                        question={item.question}
                        value={answers[item.id] ?? ''}
                      />
                      <SaveIndicator state={saveStates[item.id]} />
                    </>
                  ) : (
                    <UnsupportedBlock block={{ id: item.id, sortOrder: item.sortOrder, type: 'QUESTION' }} />
                  )}
                </li>
              ))}
            </ol>
            <div className="lp-exercise__actions">
              {active > 0 ? <Button className="lp-btn" onClick={() => setActive(active - 1)} type="button" variant="outline"><ArrowLeft aria-hidden="true" />Phần trước</Button> : null}
              {active < sections.length - 1 ? <Button className="lp-btn" onClick={() => setActive(active + 1)} type="button" variant="outline">Phần tiếp<ArrowRight aria-hidden="true" /></Button> : null}
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-test-bar">
        <p aria-live="polite"><strong>{answeredCount}/{answerable.length}</strong> câu đã trả lời</p>
        {confirming ? <p className="lp-hint" role="status">Còn {unanswered} câu bỏ trống, các câu đó sẽ tính sai. Bấm lần nữa để nộp.</p> : null}
        {error ? <p className="lp-error" role="alert">{error}</p> : null}
        <Button className="lp-btn lp-btn--accent lp-btn--cta" disabled={submitting} onClick={submit} type="button">
          {submitting ? <Loader2 aria-hidden="true" className="lp-spin" /> : <Send aria-hidden="true" />}
          {submitting ? 'Đang nộp…' : confirming ? 'Vẫn nộp bài' : 'Nộp bài'}
        </Button>
      </footer>
    </article>
  )
}

function SaveIndicator({ state }: { state: SaveState | undefined }) {
  if (!state) return null
  if (state === 'saving') return <p className="lp-save">Đang lưu…</p>
  if (state === 'error') return <p className="lp-save lp-save--error"><CloudOff aria-hidden="true" size={14} />Chưa lưu được, sẽ thử lại khi nộp</p>
  return <p className="lp-save lp-save--ok"><Check aria-hidden="true" size={14} />Đã lưu</p>
}
