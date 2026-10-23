import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { getReviewEssay, submitReview } from '../api/examinerReviewApi'
import { BLIND_NOTE, overallBand, taskLabel } from '../lib/reviewLabels'
import { CRITERIA, reviewSchema, type CriterionKey, type ReviewEssay } from '../types'
import '../examiner-review.css'

const BANDS = Array.from({ length: 19 }, (_, index) => index / 2)
type Scores = Record<CriterionKey, number>

function RubricReference({ rubric }: { rubric: unknown }) {
  if (rubric == null) return null
  return (
    <details className="adm-card">
      <summary>Rubric tham khảo</summary>
      <pre className="adm-er-rubric">{JSON.stringify(rubric, null, 2)}</pre>
    </details>
  )
}

function ReviewForm({ jobId, essay }: { jobId: string; essay: ReviewEssay }) {
  const [scores, setScores] = useState<Scores>({ taskResponse: 6, coherence: 6, lexical: 6, grammar: 6 })
  const [overall, setOverall] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const band = overall ?? overallBand(scores)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const body = reviewSchema.safeParse({ gradingJobId: jobId, reviewerBand: band, reviewerCriteria: scores, note: note.trim() || undefined })
    if (!body.success) {
      setError('Mỗi band phải từ 0 đến 9, theo bước 0,5, và ghi chú tối đa 4000 ký tự.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await submitReview(body.data)
      navigate('/content-author/examiner-review')
    } catch (reason) {
      setError(adminErrorMessage(reason))
      setBusy(false)
    }
  }

  return (
    <form className="adm-er-form" onSubmit={(event) => void submit(event)}>
      <p className="adm-muted">{BLIND_NOTE}</p>
      <fieldset className="adm-er-fields" disabled={busy}>
        {CRITERIA.map(({ key, label }) => (
          <label className="adm-field" key={key}>
            <span>{label}</span>
            <select className="adm-select" value={scores[key]} onChange={(event) => { setScores({ ...scores, [key]: Number(event.target.value) }); setOverall(null) }}>
              {BANDS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        ))}
        <label className="adm-field">
          <span>Band tổng</span>
          <select className="adm-select" value={band} onChange={(event) => setOverall(Number(event.target.value))}>
            {BANDS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="adm-field">
          <span>Ghi chú (tối đa 4000 ký tự)</span>
          <textarea className="adm-textarea" maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="adm-er-actions">
          <button className="adm-btn adm-btn--primary" type="submit">{busy ? 'Đang gửi…' : 'Nộp bài chấm lại'}</button>
          <Link className="adm-btn" to="/content-author/examiner-review">Quay lại danh sách</Link>
        </div>
      </fieldset>
      {error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}
      <p className="adm-muted">Bài {taskLabel(essay.task)}.</p>
    </form>
  )
}

function ReviewEssay({ jobId }: { jobId: string }) {
  const essay = useAdminResource(`review-essay:${jobId}`, (signal) => getReviewEssay(jobId, signal))
  return (
    <AdminPage title="Chấm lại bài Writing" actions={<Link className="adm-btn" to="/content-author/examiner-review">Danh sách</Link>}>
      <div className="adm-er-workspace">
        {essay.status === 'loading' ? <AdminLoading /> : null}
        {essay.status === 'error' ? <AdminError message={essay.error!} onRetry={essay.reload} /> : null}
        {essay.data ? (
          <>
            {essay.data.prompt ? <section className="adm-card"><h2>Đề bài</h2><p className="adm-er-text">{essay.data.prompt}</p></section> : null}
            <section className="adm-card"><h2>Bài viết</h2><p className="adm-er-text">{essay.data.essay}</p></section>
            <RubricReference rubric={essay.data.rubric} />
            <ReviewForm essay={essay.data} jobId={jobId} />
          </>
        ) : null}
      </div>
    </AdminPage>
  )
}

export function ReviewEssayPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const id = z.uuid().safeParse(jobId)
  return id.success ? <ReviewEssay jobId={id.data} key={id.data} /> : <AdminPage title="Chấm lại bài Writing"><AdminError message="ID bài chấm lại không hợp lệ." /></AdminPage>
}
