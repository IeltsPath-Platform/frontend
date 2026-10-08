import { useEffect, useState } from 'react'
import { ArrowRight, Check, Mic, RotateCcw, SkipForward, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { learningApi, toApiError } from '../api'
import { reportApiError } from '../lib/reviewGate'
import { PlacementExamShell, type SectionRunnerProps } from './PlacementExamShell'
import { questionItems, readSpokenSeconds, spokenAnswer } from './placementSkills'
import { useMicRecorder } from './useMicRecorder'

const MIC_TEST_SECONDS = 20
const ANSWER_SECONDS = 60
const COUNTDOWN_MS = 3000

type Phase =
  | { kind: 'guide' }
  | { kind: 'mic' }
  | { kind: 'question'; index: number; stage: 'countdown' | 'recording' }

const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

/** Speaking: guidance, a microphone check, then each question records on its own after a short countdown. */
export function SpeakingSectionRunner(props: SectionRunnerProps) {
  const { attemptId, section, partNumber, answers, setAnswer, saveAnswer, onExit, onComplete } = props
  const items = questionItems(section)
  const recorder = useMicRecorder()
  const [phase, setPhase] = useState<Phase>({ kind: 'guide' })
  const [error, setError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  // Recorded lengths live in the answer map, so a resumed section knows which questions are done.
  const isRecorded = (itemId: string) => readSpokenSeconds(answers[itemId]) > 0
  const firstOpen = Math.max(0, items.findIndex((item) => !isRecorded(item.id)))

  /** Each recording's length is saved as the item's response, so a resumed section knows what was recorded. */
  async function record(itemId: string, length: number): Promise<boolean> {
    const value = spokenAnswer(length)
    setAnswer(itemId, value)
    const saved = await saveAnswer(itemId, value)
    if (!saved) setError('Chưa lưu được bản ghi. Kiểm tra kết nối rồi ghi lại câu này.')
    return saved
  }

  /**
   * Sends a submission for every recorded question and hands the section in. `last` is the recording that just
   * stopped, which this render's answers do not hold yet.
   */
  async function finish(last?: { itemId: string; length: number }) {
    setFinishing(true)
    setError(null)
    if (last && !(await record(last.itemId, last.length))) {
      setFinishing(false)
      return
    }
    try {
      for (const item of items) {
        if (!isRecorded(item.id) && item.id !== last?.itemId) continue
        // The backend stores a reference only; recordings are not uploaded yet.
        await learningApi.submitLearnerSubmission({
          attemptItemId: item.id,
          promptSnapshot: JSON.stringify({ stem: item.question?.prompt ?? '' }),
          skill: 'SPEAKING',
          audioReference: `local-recording:${attemptId}:${item.id}`,
          submissionKey: `placement-speaking-${attemptId}-${item.id}`,
        })
      }
      await onComplete()
    } catch (reason) {
      const apiError = toApiError(reason)
      reportApiError(apiError)
      setError(`${apiError.message.replace(/[.!?]?$/, '.')} Hãy nộp lại.`)
      setFinishing(false)
    }
  }

  // Each question starts recording by itself once its countdown ends.
  useEffect(() => {
    if (phase.kind !== 'question' || phase.stage !== 'countdown') return
    const item = items[phase.index]
    if (!item) return
    const timer = window.setTimeout(() => {
      void recorder.start(ANSWER_SECONDS, (length) => {
        if (phase.index + 1 < items.length) {
          void record(item.id, length)
          setPhase({ kind: 'question', index: phase.index + 1, stage: 'countdown' })
        } else {
          void finish({ itemId: item.id, length })
        }
      }).then((started) => {
        if (started) setPhase({ kind: 'question', index: phase.index, stage: 'recording' })
      })
    }, COUNTDOWN_MS)
    return () => window.clearTimeout(timer)
    // The recorder and handlers are stable enough per phase; re-running on them would restart the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const current = phase.kind === 'question' ? items[phase.index] : undefined

  const footer = (
    <>
      <nav className="pl-qnav" aria-label="Tiến độ phần Speaking">
        <span className="pl-qnav__label">Part {partNumber}</span>
        <div className="pl-qnav__numbers">
          <span className="pl-qnav__chip" data-answered={phase.kind !== 'guide'}>Intro</span>
          {items.map((item, index) => (
            <span aria-current={phase.kind === 'question' && phase.index === index ? 'true' : undefined} className="pl-qnav__num"
              data-answered={isRecorded(item.id)} key={item.id}>
              {item.question?.number ?? index + 1}
            </span>
          ))}
        </div>
      </nav>
      {recorder.state === 'unavailable' ? (
        <div className="pl-exam__actions">
          <Button className="pl-btn pl-btn--accent" disabled={finishing} onClick={() => void finish()} type="button">
            <SkipForward aria-hidden="true" />
            Bỏ qua phần Speaking
          </Button>
        </div>
      ) : null}
      {finishing ? <p className="pl-exam__notice" role="status">Đang nộp phần Speaking…</p> : null}
      {error ? (
        <div className="pl-exam__actions">
          <p className="pl-exam__notice lp-error" role="alert">{error}</p>
          {!finishing && phase.kind === 'question' ? (
            <Button className="pl-btn pl-btn--accent" onClick={() => void finish()} type="button">Nộp lại</Button>
          ) : null}
        </div>
      ) : null}
    </>
  )

  return (
    <PlacementExamShell footer={footer} onExit={() => { recorder.reset(); onExit() }} partNumber={partNumber} section={section}>
      <div className="pl-speaking">
        {recorder.state === 'unavailable' ? (
          <p className="pl-speaking__warn" role="alert">
            Không dùng được micro trên thiết bị này hoặc bạn chưa cho phép truy cập. Hãy cấp quyền micro cho trang rồi mở lại phần này, hoặc bỏ qua phần Speaking.
          </p>
        ) : null}

        {phase.kind === 'guide' ? (
          <section className="pl-speaking__card" aria-labelledby="pl-speaking-guide">
            <h2 id="pl-speaking-guide">Hướng dẫn chung</h2>
            <p>Để việc làm bài diễn ra thuận lợi, bạn hãy chú ý những điểm sau:</p>
            <ul className="pl-speaking__tips">
              <li><strong>Kiểm tra loa/tai nghe và micro đã kết nối.</strong> Bạn sẽ được nói thử trước khi vào câu hỏi.</li>
              <li><strong>Làm bài ở nơi yên tĩnh.</strong> Nói gần micro để bản ghi rõ ràng.</li>
              <li><strong>Mỗi câu ghi âm tối đa {ANSWER_SECONDS} giây.</strong> Ghi âm tự bắt đầu sau khi hiện câu hỏi; trả lời xong hãy bấm dừng để sang câu tiếp.</li>
            </ul>
            <p className="lp-hint">Phần Speaking hiện chưa được chấm riêng; bản ghi chỉ lưu trên trình duyệt của bạn.</p>
            <Button className="pl-btn pl-btn--accent" onClick={() => setPhase({ kind: 'mic' })} type="button">Tiếp tục<ArrowRight aria-hidden="true" /></Button>
          </section>
        ) : null}

        {phase.kind === 'mic' ? (
          <section className="pl-speaking__card" aria-labelledby="pl-speaking-mic">
            <h2 id="pl-speaking-mic">Kiểm tra micro</h2>
            <ul className="pl-speaking__tips">
              <li>Bạn có {MIC_TEST_SECONDS} giây để nói thử.</li>
              <li>Trình duyệt sẽ hỏi quyền dùng micro; hãy bấm cho phép.</li>
              <li>Nghe lại bản ghi để chắc chắn giọng của bạn rõ ràng.</li>
            </ul>
            {recorder.state === 'recording' ? (
              <div className="pl-speaking__rec" role="status">
                <span className="pl-rec-dot" aria-hidden="true" />Đang ghi {clock(recorder.seconds)} / {clock(MIC_TEST_SECONDS)}
                <Button className="pl-btn" onClick={recorder.stop} type="button" variant="outline"><Square aria-hidden="true" />Dừng</Button>
              </div>
            ) : null}
            {recorder.state === 'recorded' && recorder.audioUrl ? (
              <audio className="pl-speaking__playback" controls src={recorder.audioUrl}>Trình duyệt không phát được bản ghi.</audio>
            ) : null}
            <div className="pl-speaking__actions">
              {recorder.state === 'recorded' ? (
                <>
                  <Button className="pl-btn" onClick={() => { recorder.reset(); void recorder.start(MIC_TEST_SECONDS) }} type="button" variant="outline">
                    <RotateCcw aria-hidden="true" />Thử lại
                  </Button>
                  <Button className="pl-btn pl-btn--accent" onClick={() => { recorder.reset(); setPhase({ kind: 'question', index: firstOpen, stage: 'countdown' }) }} type="button">
                    Bắt đầu phần thi<ArrowRight aria-hidden="true" />
                  </Button>
                </>
              ) : recorder.state !== 'recording' ? (
                <Button className="pl-btn pl-btn--accent" disabled={recorder.state === 'unavailable'} onClick={() => void recorder.start(MIC_TEST_SECONDS)} type="button">
                  <Mic aria-hidden="true" />Kiểm tra micro
                </Button>
              ) : null}
              {recorder.state !== 'recording' ? (
                <button className="pl-link" onClick={() => { recorder.reset(); setPhase({ kind: 'question', index: firstOpen, stage: 'countdown' }) }} type="button">
                  <SkipForward aria-hidden="true" size={16} />Bỏ qua
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {phase.kind === 'question' && current ? (
          <section className="pl-speaking__stage" aria-live="polite" aria-labelledby="pl-speaking-question">
            <p className="pl-speaking__count">Câu {phase.index + 1}/{items.length}</p>
            <h2 className="pl-speaking__question" id="pl-speaking-question">{current.question?.prompt}</h2>
            {phase.stage === 'countdown' ? (
              <div className="pl-speaking__countdown">
                <p>Ghi âm sẽ bắt đầu sau câu hỏi</p>
                <span className="pl-countdown-bar" key={phase.index} style={{ animationDuration: `${COUNTDOWN_MS}ms` }} />
              </div>
            ) : recorder.state !== 'recording' ? (
              <p className="pl-speaking__count" role="status">Đã ghi xong câu này.</p>
            ) : (
              <div className="pl-speaking__rec" role="status">
                <span className="pl-rec-dot" aria-hidden="true" />Đang ghi âm {clock(recorder.seconds)} / {clock(ANSWER_SECONDS)}
                <Button className="pl-btn pl-btn--accent" onClick={recorder.stop} type="button">
                  {phase.index + 1 < items.length ? <ArrowRight aria-hidden="true" /> : <Check aria-hidden="true" />}
                  {phase.index + 1 < items.length ? 'Dừng & sang câu tiếp' : 'Dừng & hoàn thành'}
                </Button>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </PlacementExamShell>
  )
}
