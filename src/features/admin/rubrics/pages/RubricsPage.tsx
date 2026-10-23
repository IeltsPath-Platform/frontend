import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { fetchActiveRubrics, fetchDraftRubrics } from '../api/rubricApi'
import { RubricEditor } from '../components/RubricEditor'
import { RubricView } from '../components/RubricView'
import { RubricVersionDraftAction } from '../components/RubricVersionDraftAction'
import { rubricDraft, rubricRequest } from '../lib/rubricDraft'
import { RUBRIC_VERSIONS_ENABLED } from '../rubricFlags'
import { type RubricRequest, type WritingTask } from '../types'
import '../rubrics.css'

function TaskRubrics({ task }: { task: WritingTask }) {
  const active = useAdminResource(`rubrics-active|${task}`, (signal) => fetchActiveRubrics(task, signal))
  const drafts = useAdminResource(`rubrics-drafts|${task}`, (signal) => fetchDraftRubrics(task, signal))
  const [editing, setEditing] = useState<{ body: RubricRequest; persisted: boolean } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  function reload() { active.reload(); drafts.reload() }
  return <>
    {notice ? <p role="status">{notice}</p> : null}
    <section aria-label="Đang dùng">
      <h2>Đang dùng</h2>
      {active.status === 'loading' ? <AdminLoading label="Đang tải rubric đang dùng…" /> : null}
      {active.status === 'error' ? <AdminError message={active.error!} onRetry={active.reload} /> : null}
      {active.status === 'success' && !active.data?.length ? <AdminEmpty title="Chưa có rubric đang dùng cho Task này" /> : null}
      {active.data?.map((rubric) => {
        const nextDraft = !RUBRIC_VERSIONS_ENABLED && drafts.status === 'success' ? rubricDraft(rubric, [...(active.data ?? []), ...(drafts.data ?? [])]) : null
        return <div key={`${rubric.code}-${rubric.version}`}>
          <details className="adm-rubric-active">
            <summary>{rubric.code} · Phiên bản {rubric.version} · Đang dùng</summary>
            <RubricView rubric={rubric} />
          </details>
          {RUBRIC_VERSIONS_ENABLED ? <RubricVersionDraftAction rubric={rubric} disabled={!!editing} onCreate={(body) => setEditing({ body, persisted: false })} /> : <>
            {nextDraft ? <p className="adm-muted">Bản tiếp theo: {nextDraft.version} (theo các phiên bản đã tải).</p> : null}
            <button className="adm-btn" type="button" disabled={!nextDraft || !!editing} onClick={() => {
              if (nextDraft) setEditing({ body: nextDraft, persisted: false })
            }}>Tạo bản nháp từ bản đang dùng</button>
          </>}
        </div>
      })}
    </section>
    <section aria-label="Bản nháp" className="adm-rubric-drafts">
      <h2>Bản nháp</h2>
      {drafts.status === 'loading' ? <AdminLoading label="Đang tải bản nháp…" /> : null}
      {drafts.status === 'error' ? <AdminError message={drafts.error!} onRetry={drafts.reload} /> : null}
      {drafts.status === 'success' && !drafts.data?.length ? <AdminEmpty title="Chưa có bản nháp">Tạo bản nháp từ rubric đang dùng để giữ nguyên nội dung gốc.</AdminEmpty> : null}
      <ul>{drafts.data?.map((rubric) => <li key={`${rubric.code}-${rubric.version}`}><span>{rubric.code} · Phiên bản {rubric.version}</span><button className="adm-btn" type="button" disabled={!!editing} onClick={() => setEditing({ body: rubricRequest(rubric), persisted: true })}>Sửa bản nháp {rubric.version}</button></li>)}</ul>
    </section>
    {editing ? <RubricEditor key={`${editing.body.code}-${editing.body.version}`} initial={editing.body} persisted={editing.persisted} onSaved={reload} onCancel={() => setEditing(null)} onActivated={() => { setEditing(null); setNotice('Đã kích hoạt rubric.'); reload() }} /> : null}
  </>
}

export function RubricsPage() {
  const [params, setParams] = useSearchParams()
  const task: WritingTask = params.get('task') === 'TASK_2' ? 'TASK_2' : 'TASK_1'
  return <AdminPage title="Rubric chấm Writing" subtitle="Xem tiêu chí đang áp dụng, soạn bản nháp và xác nhận trước khi kích hoạt để chấm bài Writing.">
    <nav className="adm-rubric-tabs" aria-label="Chọn Writing Task">{(['TASK_1', 'TASK_2'] as const).map((value) => <button className={`adm-btn${value === task ? ' adm-btn--primary' : ''}`} type="button" key={value} aria-pressed={task === value} onClick={() => setParams((current) => { const next = new URLSearchParams(current); next.set('task', value); return next })}>Task {value === 'TASK_1' ? '1' : '2'}</button>)}</nav>
    <TaskRubrics task={task} key={task} />
  </AdminPage>
}
