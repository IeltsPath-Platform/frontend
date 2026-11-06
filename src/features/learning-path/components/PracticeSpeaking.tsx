import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, CircleAlert, Clock, Loader2, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SpeakingRecorder } from '@/features/practice/speaking/SpeakingRecorder'
import { SpeakingWaitingPanel } from '@/features/practice/speaking/SpeakingWaitingPanel'
import { SpeakingResultDetail } from '@/features/practice/speaking/SpeakingSubmissionResultPage'
import { averageBand, parseSpeakingResult } from '@/features/practice/speaking/speakingResultView'
import type { SavedRecording } from '@/features/practice/speaking/speakingSession'
import { useSpeakingGradeFlow } from '@/features/practice/speaking/useSpeakingGradeFlow'
import { useSpeakingSubmissionResult } from '@/features/practice/speaking/useSpeakingSubmissionResult'
import type { PracticeRecorded } from '~types/learningPath'
import { toApiError, userMessage } from '../api'
import '@/features/practice/speaking/speaking-workspace.css'
import '@/features/practice/speaking/speaking-result.css'

/** A recorded answer that ended without a grade: the learner can send it again, nothing was charged. */
const ENDED_WITHOUT_GRADE = new Set(['ABANDONED', 'NEEDS_EXAMINER'])
/** Opened but never completed (a failed upload, a reloaded page): nothing waits to be graded, so the learner records again. */
const NOT_SENT = new Set(['UPLOADING'])
const WORKING = new Set(['UPLOADING', 'QUEUED', 'ANALYZING', 'GRADING', 'PAYMENT_PENDING', 'FAILED_RETRYABLE'])


interface PracticeSpeakingProps {
  attemptId: string
  /** Name of the set, for the first line of the popups. */
  title: string
  recorded: PracticeRecorded[]
  /** Hands the set in; called by itself once the answer is graded, and resolves when the server has taken it. */
  onFinish: () => Promise<void>
  /** The set was handed in. */
  finished: boolean
  /** Shown instead of the finish button once the set was handed in. */
  done?: ReactNode
}

/**
 * The recorded answer of a lesson's Practice set. The learner records, sends it to the AI (the popup asks, with the
 * teacher shown as not yet available) and follows the grading here. Once the answer is graded its result is shown in place
 * and the set is handed in by itself, which is when the grade reaches mastery. A failed or empty answer can be recorded and
 * sent again.
 */
export function PracticeSpeaking({ attemptId, title, recorded, onFinish, finished, done }: PracticeSpeakingProps) {
  const [recordings, setRecordings] = useState<Record<string, SavedRecording>>({})
  const [submissionId, setSubmissionId] = useState<string | null>(() => {
    const open = recorded.find((item) => item.latest && !ENDED_WITHOUT_GRADE.has(item.latest.status)
      && !NOT_SENT.has(item.latest.status))
    return open?.latest?.id ?? null
  })
  const ready = recorded.filter((item) => recordings[item.id])
  const flow = useSpeakingGradeFlow({
    context: title,
    attemptId,
    recordings: ready.map((item) => ({ questionVersionId: item.id, label: `Câu ${item.number}`, recording: recordings[item.id] })),
    seconds: ready.reduce((sum, item) => sum + recordings[item.id].durationSeconds, 0),
    onSent: setSubmissionId,
  })
  const passBand = recorded[0]?.passBand ?? null

  return (
    <section className="lp-rec" aria-label="Bài nói của bộ luyện tập">
      <p className="lp-eyebrow lp-rec__eyebrow"><Mic aria-hidden="true" size={15} /> Luyện thêm · Trả lời bằng giọng nói</p>
      {recorded.map((item) => (
        <article className="lp-rec__item" key={item.id}>
          <h2 className="lp-rec__prompt">{item.prompt}</h2>
          {item.durationSeconds ? (
            <p className="lp-rec__meta"><Clock aria-hidden="true" size={14} /> Nói khoảng {item.durationSeconds} giây</p>
          ) : null}
          {submissionId ? null : (
            <SpeakingRecorder
              onSaved={(recording) => setRecordings((current) => ({ ...current, [item.id]: recording }))}
              saved={recordings[item.id] ?? null}
            />
          )}
        </article>
      ))}
      {submissionId ? (
        <AnswerProgress
          done={done}
          finished={finished}
          key={submissionId}
          onFinish={onFinish}
          onRetry={() => setSubmissionId(null)}
          passBand={passBand}
          submissionId={submissionId}
        />
      ) : (
        <div className="lp-rec__actions">
          <Button
            className="lp-btn lp-btn--accent"
            disabled={ready.length !== recorded.length || flow.checking}
            onClick={flow.start}
            type="button"
          >
            {flow.checking ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : null}
            Gửi chấm bài nói
          </Button>
          {ready.length !== recorded.length ? <p className="lp-hint">Ghi âm câu trả lời trước khi gửi chấm.</p> : null}
        </div>
      )}
      {flow.dialogs}
    </section>
  )
}

/** Follows one submission until it ends, and hands the set in once it is graded. */
function AnswerProgress({ submissionId, passBand, onFinish, finished, onRetry, done }: {
  submissionId: string
  passBand: number | null
  onFinish: () => Promise<void>
  finished: boolean
  onRetry: () => void
  done?: ReactNode
}) {
  const { submission, error, short, retry } = useSpeakingSubmissionResult(submissionId)
  const [finishError, setFinishError] = useState<string | null>(null)
  const [tries, setTries] = useState(0)
  const handedIn = useRef(-1)
  const status = submission?.status
  const graded = status === 'GRADED'

  // The grade counts toward mastery only when the set is handed in, so it is handed in as soon as the answer is graded.
  useEffect(() => {
    if (!graded || finished || handedIn.current === tries) return
    handedIn.current = tries
    onFinish().catch((reason: unknown) => setFinishError(userMessage(toApiError(reason))))
  }, [graded, finished, tries, onFinish])

  if (graded) {
    const view = submission?.result ? parseSpeakingResult(submission.result) : null
    // One answer has no overall band: the mean of its criteria stands for it, as on the server.
    const band = view ? view.overallBand ?? averageBand(view.criteria) : null
    const passed = band !== null && passBand !== null ? band >= passBand : null
    return (
      <div className="lp-rec__result">
        <p className="lp-rec__band" role="status">
          <CheckCircle2 aria-hidden="true" size={18} />
          {band !== null ? <>Band ước lượng <strong>{band.toFixed(1)}</strong></> : 'Đã chấm xong'}
          {passed === null ? null : <span>{passed ? ' · Đạt' : ' · Chưa đạt'}</span>}
        </p>
        {finished ? done : null}
        {finishError ? (
          <p className="lp-hint lp-hint--warn" role="alert">
            {finishError}{' '}
            <button className="lp-rec__link" onClick={() => { setFinishError(null); setTries((value) => value + 1) }} type="button">
              Thử lại
            </button>
          </p>
        ) : null}
        {submission?.result ? (
          <div className="sres-page sres-embedded"><div className="sres-main"><SpeakingResultDetail view={parseSpeakingResult(submission.result)} /></div></div>
        ) : null}
      </div>
    )
  }

  if (status && ENDED_WITHOUT_GRADE.has(status)) {
    return (
      <div className="lp-rec__result" role="alert">
        <p className="lp-rec__band"><CircleAlert aria-hidden="true" size={18} />
          {status === 'NEEDS_EXAMINER'
            ? 'Hệ thống chưa chấm được bài nói này. Bạn không bị trừ point, hãy gửi lại.'
            : 'Chưa nghe rõ giọng nói trong bản ghi nên bài chưa được chấm. Bạn không bị trừ point, hãy ghi lại và gửi lại.'}
        </p>
        <Button className="lp-btn lp-btn--accent" onClick={onRetry} type="button">Ghi âm lại</Button>
      </div>
    )
  }

  return (
    <div className="lp-rec__result">
      {!submission && !error ? <SpeakingWaitingPanel status={undefined} /> : null}
      {status && WORKING.has(status) && !short ? <SpeakingWaitingPanel status={status} /> : null}
      {short ? (
        <p className="lp-hint lp-hint--warn" role="alert">
          Số dư point chưa đủ để nhận kết quả. Bài của bạn được giữ lại, nạp thêm point rồi thử lại.{' '}
          <button className="lp-rec__link" onClick={retry} type="button">Thử lại</button>
        </p>
      ) : null}
      {error ? (
        <p className="lp-hint lp-hint--warn" role="alert">
          {error} <button className="lp-rec__link" onClick={retry} type="button">Tải lại</button>
        </p>
      ) : null}
    </div>
  )
}
