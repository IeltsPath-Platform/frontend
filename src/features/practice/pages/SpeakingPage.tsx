import { useState } from 'react'
import { ArrowLeft, Radio, Timer } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { useSpokenPrompt } from '../hooks/useSpokenPrompt'
import { formatDuration } from '../lib/time'
import { SpeakingQuestionCard } from '../speaking/SpeakingQuestionCard'
import { SpeakingRecorder } from '../speaking/SpeakingRecorder'
import type { SpeakingTask } from '../speaking/speakingApi'
import { spokenPrompt } from '../speaking/speakingCue'
import { saveRecording, useSessionRecordings } from '../speaking/speakingSession'
import { useLeaveWarning } from '../speaking/useLeaveWarning'
import { usePartClock } from '../speaking/usePartClock'
import '../skill-workspaces.css'
import '../speaking/speaking-workspace.css'

interface SpeakingPageProps {
  task: SpeakingTask
  onExit: () => void
  /** Called from the last question of the last part: the learner is done answering and goes on to review. */
  onFinish: () => void
  /** Where the next part of a full test starts; null on the last part or when only one part was chosen. */
  nextPartPath?: string | null
  /** The question to open on, 0-based; the review sends the learner back to the one they want to record again. */
  initialIndex?: number
  /** The part's time runs; false when the learner comes back from the review to record a question again. */
  timed?: boolean
}

/**
 * One part of a Speaking test: the questions come from the library, the learner records an answer to each. Recordings are
 * kept for the whole test, so going back to a question, or on to another part, does not lose them. The part has a time,
 * a question does not: when the part's time is over the learner can only move on.
 */
export function SpeakingPage({ task, onExit, onFinish, nextPartPath = null, initialIndex = 0, timed = true }: SpeakingPageProps) {
  const clock = usePartClock(task.timeLimitSeconds, timed)
  const total = task.questions.length
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(total - 1, 0)))
  const question = task.questions[Math.min(index, total - 1)]
  // The examiner reads each question aloud when it appears; an empty part reads nothing.
  const voice = useSpokenPrompt(question ? spokenPrompt(question.prompt) : '')
  const sessionId = task.packageVersionId
  const recordings = useSessionRecordings(sessionId)
  useLeaveWarning(recordings.size > 0)

  return (
    <div className="practice-workspace-root speaking-workspace">
      <SiteNavbar />
      <header className="skill-page-topbar">
        <button type="button" className="subbar-exit-btn" onClick={onExit}><ArrowLeft aria-hidden="true" size={16} />Thoát</button>
        <div><span className="practice-mode-badge">Speaking</span><strong>{task.title}</strong></div>
        {clock.remainingSeconds !== null ? (
          <div className={`sp-clock${clock.expired ? ' is-over' : clock.remainingSeconds <= 30 ? ' is-low' : ''}`} role="timer" aria-label={`Thời gian còn lại của phần này ${formatDuration(clock.remainingSeconds)}`}>
            <Timer aria-hidden="true" size={17} />
            <span>{clock.expired ? 'Hết giờ' : formatDuration(clock.remainingSeconds)}</span>
          </div>
        ) : <Radio aria-hidden="true" size={21} />}
      </header>
      <main className="speaking-stage">
        {question ? (
          <>
            {clock.expired && (
              <p className="sp-over" role="alert">Đã hết thời gian của phần này. Bản ghi của bạn được giữ lại, hãy chuyển sang bước tiếp theo.</p>
            )}
            <SpeakingQuestionCard
              task={task}
              question={question}
              index={index}
              total={total}
              voice={voice}
              nextPartPath={nextPartPath}
              onPrevious={() => setIndex((current) => current - 1)}
              onNext={() => setIndex((current) => current + 1)}
              onFinish={onFinish}
            />
            {/* The slot stays mounted between questions, so only the first arrival is animated. */}
            <div className="sr-slot">
              <SpeakingRecorder
                key={question.questionVersionId}
                locked={clock.expired}
                saved={recordings.get(question.questionVersionId) ?? null}
                onSaved={(recording) => saveRecording(sessionId, question.questionVersionId, recording)}
                onStart={voice.stop}
              />
            </div>
          </>
        ) : (
          <section className="sq-card"><h1 className="sq-title">Phần này chưa có câu hỏi</h1></section>
        )}
      </main>
    </div>
  )
}
