import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Circle } from 'lucide-react'
import { z } from 'zod'
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState'
import { ERROR_CATEGORY_LABEL } from '@/features/admin/error-types/lib/errorTypeLabels'
import type { ErrorType } from '@/features/admin/error-types/types'
import { sourceLabel, taskLabel } from '@/features/admin/examiner-review/lib/reviewLabels'
import { CRITERIA, type CriterionKey } from '@/features/admin/examiner-review/types'
import { adminErrorMessage } from '@/features/admin/lib/adminErrors'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { AdminPage } from '@/features/admin/pages/AdminPage'
import { claimGradingJob, completeGrading, fetchActiveErrorTypes, getGradingDraft, getGradingEssay, saveGradingDraft } from '../api/examinerGradingApi'
import { AnnotatedEssay } from '../components/AnnotatedEssay'
import { BandStepper } from '../components/BandStepper'
import { CommentBox } from '../components/CommentBox'
import { ErrorForm } from '../components/ErrorForm'
import { PromptCard } from '../components/PromptCard'
import { SplitPane } from '../components/SplitPane'
import { CRITERION_HINTS, CRITERION_PHRASES, OVERALL_PHRASES } from '../lib/commentPhrases'
import { usedCodes, type Range } from '../lib/annotations'
import { BLIND_NOTE, UNSUPPORTED_NOTE, checklist, emptyComments, emptyScores, overallWorking, timeOfDay, type Comments, type Scores } from '../lib/gradingLabels'
import { completionSchema, draftPayloadSchema, type Annotation, type Draft, type GradingEssay } from '../types'
import '../examiner-grading.css'

const QUEUE = '/admin/grading/writing'
/** The error kinds that apply to an essay; reading and listening strategies do not. */
const WRITING_CATEGORIES: readonly string[] = ['GRAMMAR', 'VOCABULARY', 'COHERENCE', 'TASK', 'SPELLING_NUMBER']

interface Workspace { essay: GradingEssay; draft: Draft | null; errorTypes: ErrorType[] }

/** Taking the job comes first: the essay is only readable by the examiner who took it. */
async function loadWorkspace(jobId: string, signal: AbortSignal): Promise<Workspace> {
  await claimGradingJob(jobId)
  const [essay, draft, errorTypes] = await Promise.all([getGradingEssay(jobId, signal), getGradingDraft(jobId, signal), fetchActiveErrorTypes(signal)])
  return { essay, draft, errorTypes: errorTypes.filter((type) => type.status === 'ACTIVE' && WRITING_CATEGORIES.includes(type.category)) }
}

/** What the examiner had filled in when the draft was saved. Anything that does not fit the essay any more is dropped. */
function restore(draft: Draft | null, essay: string) {
  const scores = emptyScores()
  const comments = emptyComments()
  let feedback = ''
  let annotations: Annotation[] = []
  const parsed = draftPayloadSchema.safeParse(draft?.payload)
  if (parsed.success) {
    for (const item of parsed.data.criteria ?? []) {
      const criterion = CRITERIA.find(({ key }) => key === item.criterion)
      if (criterion) { scores[criterion.key] = item.band ?? null; comments[criterion.key] = item.comment ?? '' }
    }
    feedback = parsed.data.feedback ?? ''
    annotations = (parsed.data.annotations ?? []).filter((item) => essay.slice(item.start, item.end) === item.excerpt)
  }
  return { scores, comments, feedback, annotations }
}

function Step({ done, children }: { done: boolean; children: string }) {
  return (
    <li className={done ? 'is-done' : undefined}>
      {done ? <Check aria-hidden="true" size={16} /> : <Circle aria-hidden="true" size={16} />}
      <span>{children}</span>
      <span className="adm-sr-only">{done ? ' (xong)' : ' (chưa xong)'}</span>
    </li>
  )
}

function GradingForm({ jobId, essay, draft, errorTypes }: { jobId: string; essay: GradingEssay; draft: Draft | null; errorTypes: ErrorType[] }) {
  const [initial] = useState(() => restore(draft, essay.essay))
  const [scores, setScores] = useState<Scores>(initial.scores)
  const [comments, setComments] = useState<Comments>(initial.comments)
  const [feedback, setFeedback] = useState(initial.feedback)
  const [annotations, setAnnotations] = useState<Annotation[]>(initial.annotations)
  const [selection, setSelection] = useState<Range | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(draft?.savedAt ?? null)
  const [busy, setBusy] = useState<'save' | 'complete' | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  // The overall band is worked out from the four criteria, never chosen: a saved draft keeps the criteria, not a band of its own.
  const working = overallWorking(scores)
  const band = working?.band ?? null
  const check = checklist(scores, comments, feedback)
  const typeOf = (code: string) => errorTypes.find((type) => type.code === code)

  const criteria = () => CRITERIA.map(({ key }) => ({ criterion: key, band: scores[key], comment: comments[key] }))

  async function saveDraft() {
    if (busy) return
    setBusy('save')
    setError(null)
    try {
      await saveGradingDraft(jobId, { band, criteria: criteria(), feedback, annotations, errorCodes: usedCodes(annotations) })
      setSavedAt(new Date().toISOString())
    } catch (reason) {
      setError(adminErrorMessage(reason))
    } finally {
      setBusy(null)
    }
  }

  async function complete() {
    if (busy) return
    const body = completionSchema.safeParse({ band, criteria: criteria(), errorCodes: usedCodes(annotations), feedback, annotations })
    if (!body.success) {
      setError('Mỗi band phải từ 0 đến 9, theo bước 0,5, và mọi tiêu chí cần có nhận xét.')
      setConfirming(false)
      return
    }
    setBusy('complete')
    setError(null)
    try {
      await completeGrading(jobId, body.data)
      navigate(QUEUE, { state: { completed: true } })
    } catch (reason) {
      setError(adminErrorMessage(reason))
      setConfirming(false)
      setBusy(null)
    }
  }

  function setScore(key: CriterionKey, value: number | null) {
    setScores({ ...scores, [key]: value })
  }

  const essayPane = (
    <>
      <PromptCard images={essay.images} prompt={essay.prompt} />
      <section className="adm-card">
        <h2>Bài làm của học viên</h2>
        <p className="adm-muted">Bôi đen đoạn có lỗi rồi điền form bên dưới. Chỉ đọc: bạn không sửa được nội dung bài làm.</p>
        <AnnotatedEssay annotations={annotations} essay={essay.essay} onSelect={setSelection} />
      </section>
      <section className="adm-card">
        <h2>Lỗi đã ghi nhận ({annotations.length})</h2>
        <ErrorForm
          annotations={annotations}
          errorTypes={errorTypes}
          essay={essay.essay}
          key={selection ? `${selection.start}-${selection.end}` : 'manual'}
          onAdd={(annotation) => { setAnnotations([...annotations, annotation]); setSelection(null); window.getSelection()?.removeAllRanges() }}
          selection={selection} />
        {annotations.length === 0 ? <p className="adm-muted">Chưa ghi nhận lỗi nào.</p> : (
          <ol className="adm-eg-errors">
            {annotations.map((item, index) => {
              const type = typeOf(item.errorCode)
              return (
                <li key={`${item.start}-${item.end}`}>
                  <span className="adm-eg-errors__n">{index + 1}</span>
                  <span className="adm-badge" title={type ? ERROR_CATEGORY_LABEL[type.category] : undefined}>{type?.name ?? item.errorCode}</span>
                  <span className="adm-eg-errors__text"><s>{item.excerpt}</s> → <strong>{item.suggestion}</strong></span>
                  <button aria-label={`Xóa lỗi ${index + 1}`} className="adm-btn adm-btn--small" onClick={() => setAnnotations(annotations.filter((_, at) => at !== index))} type="button">Xóa</button>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </>
  )

  const scoringPane = (
    <>
      {CRITERIA.map(({ key, label }, index) => (
        <section className="adm-card eg-criterion" key={key}>
          <header className="eg-criterion__head">
            <div className="eg-criterion__title">
              <span aria-hidden="true" className="eg-criterion__n">{index + 1}</span>
              <div>
                <h2>{label}</h2>
                <p className="eg-criterion__hint">{CRITERION_HINTS[key]}</p>
              </div>
            </div>
            <BandStepper label={`Band ${label}`} onChange={(value) => setScore(key, value)} value={scores[key]} />
          </header>
          <CommentBox
            label={`Nhận xét ${label}`}
            onChange={(value) => setComments({ ...comments, [key]: value })}
            phrases={CRITERION_PHRASES[key]}
            placeholder="Nhận xét cho tiêu chí này: điểm tốt, điểm cần sửa, ví dụ trong bài."
            value={comments[key]} />
        </section>
      ))}
      <section className="adm-card eg-criterion eg-criterion--overall">
        <header className="eg-criterion__head">
          <div className="eg-criterion__title">
            <div>
              <h2>Điểm tổng</h2>
              <p className="eg-criterion__hint">Tự tính: trung bình 4 tiêu chí, làm tròn 0,5. Không nhập tay.</p>
            </div>
          </div>
          <output aria-label="Band tổng" className="eg-overall">{band === null ? '—' : band.toFixed(1)}</output>
        </header>
        <p className="adm-muted">
          {working === null
            ? 'Chấm đủ 4 tiêu chí, band tổng sẽ tự hiện ở đây.'
            : `(${working.bands.map((value) => value.toFixed(1)).join(' + ')}) ÷ 4 = ${Number(working.mean.toFixed(3))}, làm tròn thành ${working.band.toFixed(1)}.`}
        </p>
      </section>      <section className="adm-card">
        <h2>Nhận xét chung</h2>
        <CommentBox
          label="Nhận xét chung"
          minRows={5}
          onChange={setFeedback}
          phrases={OVERALL_PHRASES}
          placeholder="Tóm tắt cho học viên: điểm mạnh, việc nên sửa trước, cách luyện tiếp."
          value={feedback} />
      </section>
      <section className="adm-card">
        <h2>Kiểm tra trước khi hoàn tất</h2>
        <ul className="adm-eg-checklist">
          <Step done={check.allGraded}>Đã chấm đủ 4 tiêu chí</Step>
          <Step done={check.allCommented}>Mỗi tiêu chí có nhận xét</Step>
          <Step done={check.hasFeedback}>Có nhận xét chung</Step>
        </ul>
      </section>
      <footer className="eg-actionbar">
        {error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}
        {confirming ? (
          <div aria-label="Xác nhận hoàn tất" className="adm-alert" role="group">
            <p>Sau khi hoàn tất, học viên nhận kết quả và bạn không sửa được nữa.</p>
            <div className="adm-eg-actions">
              <button className="adm-btn adm-btn--primary ex-action" disabled={busy !== null} onClick={() => void complete()} type="button">{busy === 'complete' ? 'Đang gửi…' : 'Xác nhận hoàn tất'}</button>
              <button className="adm-btn ex-action" disabled={busy !== null} onClick={() => setConfirming(false)} type="button">Quay lại chấm</button>
            </div>
          </div>
        ) : (
          <div className="adm-eg-actions">
            <button className="adm-btn ex-action" disabled={busy !== null} onClick={() => void saveDraft()} type="button">{busy === 'save' ? 'Đang lưu…' : 'Lưu nháp'}</button>
            <button className="adm-btn adm-btn--primary ex-action" disabled={busy !== null || !check.ready} onClick={() => setConfirming(true)} type="button">Hoàn tất chấm</button>
          </div>
        )}
        {savedAt ? <p className="adm-muted" role="status">Đã lưu nháp lúc {timeOfDay(savedAt)}</p> : null}
      </footer>
    </>
  )

  return <SplitPane left={essayPane} right={<div aria-label="Chấm điểm" className="eg-scoring" role="region">{scoringPane}</div>} storageKey="examiner-grading-split" />
}

function GradingWorkspace({ jobId }: { jobId: string }) {
  const workspace = useAdminResource(`grading-workspace:${jobId}`, (signal) => loadWorkspace(jobId, signal))
  const essay = workspace.data?.essay
  const subtitle = essay ? `${taskLabel(essay.task)} · ${sourceLabel({ attemptType: null, source: essay.source })}. ${BLIND_NOTE}` : undefined
  return (
    <AdminPage actions={<Link className="adm-btn" to={QUEUE}>Danh sách bài</Link>} subtitle={subtitle} title="Chấm bài Writing">
      {workspace.status === 'loading' ? <AdminLoading /> : null}
      {workspace.status === 'error' ? <AdminError message={workspace.error!} onRetry={workspace.reload} /> : null}
      {workspace.data && essay?.attemptId ? <p className="adm-alert" role="alert">{UNSUPPORTED_NOTE}</p> : null}
      {workspace.data && essay && !essay.attemptId
        ? <GradingForm draft={workspace.data.draft} errorTypes={workspace.data.errorTypes} essay={essay} jobId={jobId} />
        : null}
    </AdminPage>
  )
}

export function WritingGradingPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const id = z.guid().safeParse(jobId)
  return id.success
    ? <GradingWorkspace jobId={id.data} key={id.data} />
    : <AdminPage title="Chấm bài Writing"><AdminError message="ID bài chấm không hợp lệ." /></AdminPage>
}
