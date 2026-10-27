import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { ApiErrorState, LoadingState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import { getExaminer } from './examinerApi'
import { listExaminerReviews } from './examinerReviewsApi'
import { TeacherCard } from './ExaminerList'
import { getMyGradingJobs } from './gradingJobApi'
import type { JobState } from './gradingJobApi'
import { LateExaminerNotice } from './LateExaminerNotice'
import '../reading/reading-workspace.css'
import './writing-result.css'
import './writing-examiner.css'

const REVIEWS_PATH = '/writing-reviews'
const POLL_MS = 60_000
/** States that no longer change by themselves: the page stops asking. */
const SETTLED: ReadonlySet<JobState> = new Set(['COMPLETED', 'CANCELLED', 'CLOSED'])

const STATE_TEXT: Record<JobState, string> = {
  AWAITING_CHOICE: 'Bài này chưa có giáo viên chấm.',
  WAITING: 'Giáo viên đang chấm bài của bạn. Kết quả sẽ hiện khi giáo viên chấm xong.',
  OVERDUE: 'Giáo viên chưa chấm xong trong 48 giờ.',
  COMPLETED: 'Giáo viên đã chấm xong bài này.',
  CANCELLED: 'Bạn đã hủy yêu cầu chấm bài này. Lượt giáo viên chấm đã được hoàn lại, bạn có thể gửi lại bài cho một giáo viên khác.',
  CLOSED: 'Bài này không còn được chấm.',
}

/** The heading by state; everything not listed is a job still waiting. */
const TITLES: Partial<Record<JobState, string>> & { WAITING: string } = {
  WAITING: 'Bài đang chờ giáo viên chấm',
  COMPLETED: 'Giáo viên đã chấm xong bài',
  CANCELLED: 'Đã hủy yêu cầu chấm bài',
}

const deadlineText = (iso: string | null | undefined) => {
  const date = iso ? new Date(iso) : null
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('vi-VN') : null
}

/**
 * One job waiting for an examiner, opened from the notice that the examiner is late. It works for every source (a Practice
 * essay, a Mock test), so it does not need the essay: who grades it, until when, and what the learner can do when it is late.
 */
export function GradingJobPage() {
  const { jobId = '' } = useParams()
  const found = useApiResource(`grading-job:${jobId}`, async () => ({ job: (await getMyGradingJobs()).find((item) => item.id === jobId) ?? null }))
  const examinerId = found.data?.job?.examinerId ?? null
  const profile = useApiResource(`examiner:${examinerId ?? ''}`, () => (examinerId ? getExaminer(examinerId).catch(() => null) : Promise.resolve(null)))
  const job = found.data?.job ?? null
  // A finished essay of a Practice or Lesson has a result page; the learner goes straight to it instead of looking it up.
  const finishedReviewId = job?.state === 'COMPLETED' ? job.reviewSubmissionId ?? null : null
  const finished = useApiResource(`grading-job-result:${finishedReviewId ?? ''}`, async () => (finishedReviewId
    ? (await listExaminerReviews(0, 50).catch(() => null))?.items.find((item) => item.reviewSubmissionId === finishedReviewId) ?? null
    : null))
  const resultPath = finished.data ? `/practice/writing/submissions/${finished.data.submissionId}/result` : REVIEWS_PATH

  // Nothing to press to check: while the job is not settled, the page asks again every minute.
  const settled = job !== null && SETTLED.has(job.state)
  const { reload } = found
  useEffect(() => {
    if (settled) return undefined
    const id = window.setInterval(reload, POLL_MS)
    return () => window.clearInterval(id)
  }, [settled, reload])

  return (
    <div className="wr-page">
      <SiteNavbar />
      <main className="wr-main">
        <h1 className="wr-h2">{TITLES[job?.state ?? 'WAITING'] ?? TITLES.WAITING}</h1>
        {found.status === 'loading' && <LoadingState label="Đang tải bài chấm…" />}
        {found.status === 'error' && found.error && <ApiErrorState error={found.error} onRetry={found.reload} />}
        {found.status === 'success' && !job && (
          <section className="wr-card" role="alert">
            <p>Không tìm thấy bài chấm này trong danh sách của bạn.</p>
            <Link className="wr-secondary" to="/overview">Về trang chủ</Link>
          </section>
        )}
        {job && (
          <div className="we-waiting">
            {job.examinerId && <TeacherCard examiner={profile.data} />}
            <LateExaminerNotice job={job} examinerName={profile.data?.displayName} onChanged={found.reload} />
            {job.state !== 'OVERDUE' && (
              <section className="wr-card" aria-label="Trạng thái chấm bài">
                <header><h2>Trạng thái chấm bài</h2></header>
                <p>{STATE_TEXT[job.state]}</p>
                {job.state === 'WAITING' && deadlineText(job.deadline) && <p>Hạn chấm: {deadlineText(job.deadline)}</p>}
                {/* Only a way forward is offered: the result when it is graded, the list when it was cancelled. While it waits, the page checks again by itself. */}
                {finishedReviewId && (
                  <div className="wr-actions">
                    <Link className="wr-primary" to={resultPath}><ClipboardCheck size={14} aria-hidden="true" /> Xem kết quả chấm</Link>
                  </div>
                )}
                {job.state === 'CANCELLED' && (
                  <div className="wr-actions">
                    <Link className="wr-primary" to={REVIEWS_PATH}>Về danh sách bài giáo viên chấm</Link>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
