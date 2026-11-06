import { Link } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Info, Square, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SpokenPrompt } from '../hooks/useSpokenPrompt'
import { parseCueCard } from './speakingCue'
import type { SpeakingQuestion, SpeakingTask } from './speakingApi'

/** The question the learner answers now: which part and question it is, the prompt with its hints, and the way to move on. */
export function SpeakingQuestionCard({ task, question, index, total, voice, nextPartPath, onPrevious, onNext, onFinish }: {
  task: SpeakingTask
  question: SpeakingQuestion
  index: number
  total: number
  /** The examiner's voice reading the question aloud. */
  voice: SpokenPrompt
  /** Where the next part of a full test starts; null on the last part or when only one part was chosen. */
  nextPartPath: string | null
  onPrevious: () => void
  onNext: () => void
  /** Ends the test from its last question, when there is no next part. */
  onFinish: () => void
}) {
  const cue = parseCueCard(question.prompt)
  const isLast = index >= total - 1

  return (
    <section className={`sq-card${cue.points.length === 0 ? ' is-simple' : ''}`} aria-labelledby="speaking-cue-heading">
      <div className="sq-head">
        <div className="sq-head-left">
          <span className="sq-badge">{`Part ${task.partNo ?? ''}`.trim()}</span>
        </div>
        {total > 1 && <span className="sq-count">{`Question ${index + 1} / ${total}`}</span>}
      </div>
      {total > 1 && (
        <ol className="sq-progress" aria-label={`Câu ${index + 1} trên ${total}`}>
          {Array.from({ length: total }, (_, step) => <li key={step} className={step === index ? 'is-current' : step < index ? 'is-done' : ''} />)}
        </ol>
      )}

      {/* A short question (Part 1 and 3) is the focus of the card and sits in the middle of the space; a cue card lists its points. */}
      <div className="sq-body">
        <h1 id="speaking-cue-heading" key={question.questionVersionId} className="sq-title">{cue.topic}</h1>

        {cue.points.length > 0 && (
          <>
            <p className="sq-points-title">You should say:</p>
            <ul className="sq-points">{cue.points.map((point) => <li key={point}>{point}</li>)}</ul>
          </>
        )}
        {voice.supported && (
          <div className="sq-voice">
            <Button type="button" variant="outline" size="sm" className="sq-voice-play" onClick={voice.speaking ? voice.stop : voice.replay}>
              {voice.speaking ? <Square aria-hidden="true" fill="currentColor" /> : <Volume2 aria-hidden="true" />}
              {voice.speaking ? 'Dừng đọc' : 'Nghe câu hỏi'}
            </Button>
            <button type="button" role="switch" aria-checked={voice.autoRead} className="sq-voice-auto" onClick={() => voice.setAutoRead(!voice.autoRead)}>
              <span aria-hidden="true" className="sq-voice-track"><i /></span>Tự đọc câu hỏi
            </button>
            {voice.blocked && <p role="status" className="sq-voice-note">Trình duyệt đang chặn âm thanh tự phát. Bấm “Nghe câu hỏi” để nghe.</p>}
          </div>
        )}
        {task.instructions && <p className="sq-hint"><Info aria-hidden="true" size={16} /><span>{task.instructions}</span></p>}
      </div>

      {/* The last question of the last part ends the test: "Hoàn thành" opens the review before anything is sent. */}
      <nav className="sq-nav" aria-label={total > 1 ? 'Câu hỏi' : 'Kết thúc'}>
        {total > 1 ? <Button type="button" variant="outline" disabled={index === 0} onClick={onPrevious}><ChevronLeft aria-hidden="true" />Câu trước</Button> : <span />}
        {!isLast ? (
          <Button type="button" className="sq-next" onClick={onNext}>Câu sau<ChevronRight aria-hidden="true" /></Button>
        ) : nextPartPath ? (
          <Link className="sq-next-part" to={nextPartPath}>Sang phần tiếp theo<ChevronRight aria-hidden="true" size={16} /></Link>
        ) : (
          <Button type="button" className="sq-finish" onClick={onFinish}><Check aria-hidden="true" />Hoàn thành</Button>
        )}
      </nav>
    </section>
  )
}
