import { Link, useParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { ApiErrorState, LoadingState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import { getExaminer } from './examinerApi'
import { TeacherCard } from './ExaminerList'
import { getMyGradingJobs } from './gradingJobApi'
import type { JobState } from './gradingJobApi'
import { LateExaminerNotice } from './LateExaminerNotice'
import '../reading/reading-workspace.css'
import './writing-result.css'
import './writing-examiner.css'

const STATE_TEXT: Record<JobState, string> = {
  AWAITING_CHOICE: 'Bài này chưa có giáo viên chấm.',
  WAITING: 'Giáo viên đang chấm bài của bạn. Kết quả sẽ hiện khi giáo viên chấm xong.',
  OVERDUE: 'Giáo viên chưa chấm xong trong 48 giờ.',
  COMPLETED: 'Giáo viên đã chấm xong bài này.',
  CLOSED: 'Bài này không còn được chấm.',
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

  return (
    <div className="wr-page">
      <SiteNavbar />
      <main className="wr-main">
        <h1 className="wr-h2">Bài đang chờ giáo viên chấm</h1>
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
                <div className="wr-actions">
                  <button type="button" className="wr-primary" onClick={found.reload}><RefreshCw size={14} aria-hidden="true" /> Kiểm tra lại</button>
                  <Link className="wr-secondary" to="/overview">Về trang chủ</Link>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
