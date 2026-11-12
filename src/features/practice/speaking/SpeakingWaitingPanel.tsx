import { useEffect, useState } from 'react'
import { AudioLines, Check, RefreshCw } from 'lucide-react'
import './speaking-waiting.css'

/** The stages a submission goes through before its result can be shown, in order. */
const STEPS = [
  { label: 'Đã nhận bài', hint: 'Bản ghi của bạn đã vào hàng chờ.' },
  { label: 'Phân tích giọng nói', hint: 'Đang chép lời và đo phát âm từng từ, từng âm.' },
  { label: 'Chấm bài', hint: 'AI đang đọc bài nói và chấm theo từng tiêu chí.' },
  { label: 'Hoàn tất kết quả', hint: 'Kết quả sắp hiện ra.' },
] as const

const STAGE_OF: Record<string, number> = {
  UPLOADING: 0, QUEUED: 0, ANALYZING: 1, GRADING: 2, PAYMENT_PENDING: 3, FAILED_RETRYABLE: 2,
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** After this long the usual wait is over and the note says so, so a long grade is not mistaken for a stuck one. */
const LONGER_THAN_USUAL_SECONDS = 30
const MINUTES_SECONDS = 120

/**
 * What to tell the learner about the time. How long a grade takes depends on how long the answer is and how busy the
 * grader is, so no figure is promised: the note changes with the time already waited instead.
 */
function waitNote(seconds: number) {
  if (seconds >= MINUTES_SECONDS) return 'Vẫn đang chấm, bài nói dài có thể mất vài phút · bạn không cần gửi lại, kết quả sẽ tự hiện ra'
  if (seconds >= LONGER_THAN_USUAL_SECONDS) return 'Bài nói dài hoặc hệ thống đang đông nên cần thêm thời gian · vẫn đang chấm, hãy giữ trang này mở'
  return 'Thời gian chấm tùy độ dài bài nói · giữ trang này mở, kết quả sẽ tự hiện ra'
}

/** Seconds since the panel appeared, so the learner can see the page is alive and how long it has taken. */
function useElapsedSeconds() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return seconds
}

/**
 * The waiting screen: while the speech is analysed and graded the learner sees which of four stages the submission is in,
 * with a live waveform and the time waited. A retry (the grader could not be reached) keeps the same stage and says so.
 */
export function SpeakingWaitingPanel({ status }: { status: string | undefined }) {
  const seconds = useElapsedSeconds()
  const stage = status === undefined ? 0 : STAGE_OF[status] ?? 0
  const retrying = status === 'FAILED_RETRYABLE'
  const loading = status === undefined
  const title = retrying ? 'Đang thử chấm lại' : loading ? 'Đang tải kết quả' : verb(stage)
  const hint = retrying
    ? 'Lần chấm trước chưa thành công, hệ thống tự thử lại. Bạn không bị trừ point.'
    : loading ? 'Chờ một chút nhé.' : STEPS[stage]!.hint

  return <section className={`sw${retrying ? ' sw--retry' : ''}`} role="status" aria-live="polite" aria-label="Tiến trình chấm bài">
    <div className="sw__wave" aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6].map((bar) => <i key={bar} style={{ animationDelay: `${bar * 0.12}s` }} />)}</div>
    <h2>{title}</h2>
    <p className="sw__hint">{hint}</p>

    <ol className="sw__steps" aria-label="Các bước chấm bài">
      {STEPS.map((step, index) => {
        const state = index < stage ? 'done' : index === stage ? 'now' : 'todo'
        return <li key={step.label} className={`sw__step sw__step--${state}`} aria-current={state === 'now' ? 'step' : undefined}>
          <span className="sw__dot" aria-hidden="true">
            {state === 'done' ? <Check size={16} /> : state === 'now' ? (retrying ? <RefreshCw size={15} /> : <AudioLines size={16} />) : index + 1}
          </span>
          <span className="sw__label">{step.label}</span>
        </li>
      })}
    </ol>

    <div className="sw__meter" aria-hidden="true"><u style={{ width: `${((stage + 0.5) / STEPS.length) * 100}%` }} /></div>
    <p className="sw__foot"><span>Đã chờ {clock(seconds)}</span><span>{waitNote(seconds)}</span></p>
  </section>
}

function verb(stage: number) {
  return ['Đang chờ tới lượt chấm', 'Đang phân tích giọng nói', 'Đang chấm bài', 'Đang hoàn tất kết quả'][stage]!
}
