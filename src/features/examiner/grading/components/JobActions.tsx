import { Link } from 'react-router-dom'
import { Eye, PenLine } from 'lucide-react'
import { UNSUPPORTED_NOTE, canGradeHere, isInProgress } from '../lib/gradingLabels'
import type { GradingEntry } from '../types'
import '../examiner-grading.css'

const QUEUE = '/admin/grading/writing'

/** The button that opens a job to grade, always shown on its row: "Chấm bài", or "Tiếp tục chấm" once it was started. */
export function GradeAction({ entry }: { entry: Pick<GradingEntry, 'id' | 'status' | 'attemptId' | 'hasDraft'> }) {
  if (!canGradeHere(entry)) return <span className="adm-muted" title={UNSUPPORTED_NOTE}>Chưa hỗ trợ</span>
  return (
    <Link className="adm-btn adm-btn--primary ex-action" to={`${QUEUE}/${entry.id}`}>
      <PenLine aria-hidden="true" size={16} />{isInProgress(entry) ? 'Tiếp tục chấm' : 'Chấm bài'}
    </Link>
  )
}

/** The button that opens a finished job to read again. */
export function ReviewAction({ jobId }: { jobId: string }) {
  return (
    <Link className="adm-btn ex-action ex-action--view" to={`${QUEUE}/${jobId}/review`}>
      <Eye aria-hidden="true" size={16} />Xem lại
    </Link>
  )
}
