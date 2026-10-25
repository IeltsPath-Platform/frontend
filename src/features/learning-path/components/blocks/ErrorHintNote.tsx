import { Lightbulb } from 'lucide-react'
import type { ErrorHint } from '~types/learningPath'

/**
 * Names the kind of mistake behind a wrong answer and says how to avoid it. `answer` words it as what the learner just
 * did; `review` words it as what the review is there to fix.
 */
export function ErrorHintNote({ hint, variant }: { hint: ErrorHint; variant: 'answer' | 'review' }) {
  const label = variant === 'answer' ? 'Bạn mắc lỗi:' : 'Lỗi cần sửa:'
  return (
    <div aria-label="Lỗi cần sửa" className="lp-error-hint" role="note">
      <Lightbulb aria-hidden="true" size={16} />
      <div>
        <p><strong>{label}</strong> {hint.name}</p>
        {hint.fixHint ? <p>{hint.fixHint}</p> : null}
      </div>
    </div>
  )
}
