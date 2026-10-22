import { SkipBack, SkipForward } from 'lucide-react'

interface SentenceNavProps {
  /** Zero-based position of the sentence being worked on. */
  index: number
  total: number
  /** How many sentences are passed, shown next to the position. */
  passed: number
  onGoTo: (index: number) => void
}

/**
 * Where the learner is in the video, with a button to step back or on by one sentence. The stacked layout puts it
 * in the controls beside the video; the bar and the two buttons are separate items so the CSS can order them.
 */
export function SentenceNav({ index, total, passed, onGoTo }: SentenceNavProps) {
  const percent = total > 0 ? Math.round(((index + 1) / total) * 100) : 0
  return (
    <>
      <div className="vdp-nav__bar">
        <div className="vd-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Vị trí câu đang làm">
          <span style={{ width: `${percent}%` }} />
        </div>
        <p><span>Câu {index + 1} / {total}</span><span>{passed} / {total} câu đã qua</span></p>
      </div>
      <button type="button" className="vdp-nav__step vdp-nav__step--back" aria-label="Về câu trước" disabled={index <= 0} onClick={() => onGoTo(index - 1)}>
        <SkipBack aria-hidden="true" size={18} />
      </button>
      <button type="button" className="vdp-nav__step vdp-nav__step--next" aria-label="Sang câu sau" disabled={index >= total - 1} onClick={() => onGoTo(index + 1)}>
        <SkipForward aria-hidden="true" size={18} />
      </button>
    </>
  )
}
