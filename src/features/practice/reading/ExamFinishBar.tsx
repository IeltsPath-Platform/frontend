import { Send } from 'lucide-react'

/** Exam layout: what the tick opens. Next submits the attempt; the left arrow goes back to the questions. */
export function ExamFinishBar({ onNext }: { onNext: () => void }) {
  return (
    <div className="rw-finish-bar">
      <div className="rw-finish-bar-inner">
        <p>Click next to continue</p>
        <button type="button" className="rw-finish-next" onClick={onNext}><Send size={18} aria-hidden="true" /> Next</button>
      </div>
    </div>
  )
}
