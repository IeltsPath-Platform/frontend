import type { Examiner } from './examinerApi'
import { certificateText, initials } from './examinerLabels'
import './writing-examiner.css'

export function ExaminerAvatar({ examiner }: { examiner: Pick<Examiner, 'displayName' | 'avatarUrl'> }) {
  return examiner.avatarUrl
    ? <img className="we-avatar" src={examiner.avatarUrl} alt="" />
    : <span className="we-avatar" aria-hidden="true">{initials(examiner.displayName)}</span>
}

/** Who is grading (or graded) the essay. A profile that cannot be read leaves the card out: the rest matters more. */
export function TeacherCard({ examiner }: { examiner: Examiner | null }) {
  if (!examiner) return null
  return (
    <section className="we-teacher" aria-label="Giáo viên chấm bài">
      <ExaminerAvatar examiner={examiner} />
      <div>
        <strong>{examiner.displayName}</strong>
        {examiner.ieltsBand != null && <small>IELTS {examiner.ieltsBand.toFixed(1)}</small>}
        {examiner.certificates.length > 0 && <small>{examiner.certificates.map(certificateText).join(' · ')}</small>}
      </div>
    </section>
  )
}

/**
 * Examiners to choose from, each with name, photo, IELTS band and certificates. One who already took their daily share
 * is shown but cannot be picked.
 */
export function ExaminerList({ examiners, full, backlog, chosen, busy, onChoose }: {
  examiners: readonly Examiner[]
  full: ReadonlySet<string>
  /** Those of {@code full} held back by late jobs, not by today's limit: they are worded differently. */
  backlog?: ReadonlySet<string>
  chosen: string | null
  busy: boolean
  onChoose: (examinerId: string) => void
}) {
  return (
    <ul className="we-examiners" role="radiogroup" aria-label="Giáo viên">
      {examiners.map((examiner) => {
        const isFull = full.has(examiner.id)
        return (
          <li key={examiner.id}>
            <label className={`we-examiner${chosen === examiner.id && !isFull ? ' is-picked' : ''}${isFull ? ' is-full' : ''}`}>
              <input type="radio" name="examiner" value={examiner.id} disabled={isFull || busy}
                checked={chosen === examiner.id && !isFull} onChange={() => onChoose(examiner.id)} />
              <ExaminerAvatar examiner={examiner} />
              <span className="we-examiner-body">
                <strong>{examiner.displayName}</strong>
                {examiner.ieltsBand != null && <span className="we-band">IELTS {examiner.ieltsBand.toFixed(1)}</span>}
                {examiner.certificates.length > 0 && <span className="ww-muted">{examiner.certificates.map(certificateText).join(' · ')}</span>}
                {examiner.bio && <span className="ww-muted">{examiner.bio}</span>}
              </span>
              <span className={`we-state${isFull ? ' is-full' : ''}`}>{isFull ? (backlog?.has(examiner.id) ? 'Tạm chưa nhận bài mới' : 'Đã đủ bài hôm nay') : 'Còn nhận bài'}</span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
