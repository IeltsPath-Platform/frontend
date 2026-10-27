import { useState } from 'react'
import { CancelRequestDialog } from './CancelRequestDialog'
import { ChangeExaminerDialog } from './ChangeExaminerDialog'
import { cancelRequest, cancelRequestMessage, changeExaminer, changeExaminerMessage } from './gradingJobApi'
import type { MyGradingJob } from './gradingJobApi'
import './writing-examiner.css'

/** Whether the learner chose to keep waiting, remembered per job and per examiner (a new examiner starts a new deadline). */
const keptKey = (job: Pick<MyGradingJob, 'id' | 'requestedAt'>) => `grading-keep-waiting:${job.id}:${job.requestedAt ?? ''}`

function readKept(job: MyGradingJob) {
  try { return window.localStorage.getItem(keptKey(job)) === '1' } catch { return false }
}

function writeKept(job: MyGradingJob) {
  try { window.localStorage.setItem(keptKey(job), '1') } catch { /* The choice only hides the notice; it can be asked again. */ }
}

/**
 * What the learner can do once the chosen examiner is late (48 hours): keep waiting for the same examiner, or ask for
 * another one, at most twice per submission and without spending another credit. When no change is left, the learner may
 * also cancel the request and take the credit back. Nothing shows while the examiner still has time. {@code onChanged}
 * runs after the examiner was replaced or the request cancelled.
 */
export function LateExaminerNotice(props: { job: MyGradingJob; examinerName?: string | null; onChanged: () => void }) {
  // A new examiner means a new deadline, so what the learner chose before no longer applies: start the state afresh.
  return props.job.state === 'OVERDUE' ? <LateNotice key={keptKey(props.job)} {...props} /> : null
}

function LateNotice({ job, examinerName, onChanged }: {
  job: MyGradingJob
  examinerName?: string | null
  onChanged: () => void
}) {
  const [kept, setKept] = useState(() => readKept(job))
  const [choosing, setChoosing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const who = examinerName ?? 'giáo viên hiện tại'
  const reviewId = job.reviewSubmissionId ?? null

  async function cancel() {
    if (!reviewId) return
    setBusy(true)
    setError('')
    try {
      await cancelRequest(reviewId)
      setCancelling(false)
      onChanged()
    } catch (cause) {
      setError(cancelRequestMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  async function change(examinerId: string) {
    setBusy(true)
    setError('')
    try {
      await changeExaminer(job.id, examinerId)
      setChoosing(false)
      onChanged()
    } catch (cause) {
      setError(changeExaminerMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="we-late" aria-label="Giáo viên chưa chấm bài">
      <h2>Giáo viên chưa chấm xong trong 48 giờ</h2>
      {kept
        ? <p>Bạn đang tiếp tục chờ {who}. Kết quả sẽ hiện ở trang này khi giáo viên chấm xong.</p>
        : <p>Bạn có thể tiếp tục chờ {who}, hoặc đổi sang một giáo viên khác. Đổi giáo viên không mất thêm lượt chấm.</p>}
      <div className="wr-actions">
        {!kept && (
          <button type="button" className="wr-secondary" onClick={() => { writeKept(job); setKept(true) }}>
            Tiếp tục chờ {who}
          </button>
        )}
        {job.canChoose
          ? <button type="button" className="wr-primary" onClick={() => setChoosing(true)}>Yêu cầu đổi giáo viên</button>
          : (
            <p className="ww-muted">
              Bạn đã dùng hết {2 - job.changesLeft} lần đổi giáo viên cho bài này.
              {job.canCancel && reviewId ? ' Nếu không muốn chờ nữa, bạn có thể hủy yêu cầu và nhận lại lượt chấm.' : ' Hãy tiếp tục chờ.'}
            </p>
          )}
        {job.canCancel && reviewId && (
          <button type="button" className="wr-primary" onClick={() => { setError(''); setCancelling(true) }}>Hủy yêu cầu và nhận lại lượt</button>
        )}
      </div>
      {job.canChoose && <p className="ww-muted">Còn {job.changesLeft} lần đổi cho bài này.</p>}
      {cancelling && (
        <CancelRequestDialog busy={busy} error={error} onCancel={() => void cancel()} onClose={() => { setCancelling(false); setError('') }} />
      )}
      {choosing && (
        <ChangeExaminerDialog
          currentExaminerId={job.examinerId ?? null}
          changesLeft={job.changesLeft}
          busy={busy}
          error={error}
          onChange={(examinerId) => void change(examinerId)}
          onClose={() => { setChoosing(false); setError('') }}
        />
      )}
    </section>
  )
}
