import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock3, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseCueCard, speakingLimit } from './speakingCue'
import type { SpeakingQuestion, SpeakingTask } from './speakingApi'

/** The question the learner answers now: which part and question it is, the prompt with its hints, and the way to move on. */
export function SpeakingQuestionCard({ task, question, index, total, nextPartPath, onPrevious, onNext }: {
  task: SpeakingTask
  question: SpeakingQuestion
  index: number
  total: number
  /** Where the next part of a full test starts; null on the last part or when only one part was chosen. */
  nextPartPath: string | null
  onPrevious: () => void
  onNext: () => void
}) {
  const cue = parseCueCard(question.prompt)
  const isLast = index >= total - 1

  return (
    <section className={`sq-card${cue.points.length === 0 ? ' is-simple' : ''}`} aria-labelledby="speaking-cue-heading">
      <div className="sq-head">
        <div className="sq-head-left">
          <span className="sq-badge">{`Part ${task.partNo ?? ''}`.trim()}</span>
          {question.durationSeconds ? <span className="sq-limit"><Clock3 aria-hidden="true" size={14} />{`You should speak for up to ${speakingLimit(question.durationSeconds)}.`}</span> : null}
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
        {task.instructions && <p className="sq-hint"><Info aria-hidden="true" size={16} /><span>{task.instructions}</span></p>}
      </div>

      {total > 1 && (
        <nav className="sq-nav" aria-label="Câu hỏi">
          <Button type="button" variant="outline" disabled={index === 0} onClick={onPrevious}><ChevronLeft aria-hidden="true" />Câu trước</Button>
          {isLast && nextPartPath ? (
            <Link className="sq-next-part" to={nextPartPath}>Sang phần tiếp theo<ChevronRight aria-hidden="true" size={16} /></Link>
          ) : (
            <Button type="button" className="sq-next" disabled={isLast} onClick={onNext}>Câu sau<ChevronRight aria-hidden="true" /></Button>
          )}
        </nav>
      )}
      {total <= 1 && nextPartPath && (
        <nav className="sq-nav" aria-label="Phần tiếp theo">
          <span />
          <Link className="sq-next-part" to={nextPartPath}>Sang phần tiếp theo<ChevronRight aria-hidden="true" size={16} /></Link>
        </nav>
      )}
    </section>
  )
}
