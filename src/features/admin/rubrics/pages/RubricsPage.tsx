import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, Pencil, PencilLine } from 'lucide-react'
import { useToast } from '@/components/toast/toastContext'
import { AdminDrawer, AdminModal } from '../../components/AdminLayer'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { fetchActiveRubrics, fetchDraftRubrics } from '../api/rubricApi'
import { RubricCriteriaGrid } from '../components/RubricCriteriaGrid'
import { RubricEditor } from '../components/RubricEditor'
import { RubricView } from '../components/RubricView'
import { RubricVersionDraftAction } from '../components/RubricVersionDraftAction'
import { rubricDraft, rubricRequest } from '../lib/rubricDraft'
import { RUBRIC_VERSIONS_ENABLED } from '../rubricFlags'
import { type Rubric, type RubricRequest, type WritingTask } from '../types'
import '../rubrics.css'

function TaskRubrics({ task }: { task: WritingTask }) {
  const { toast } = useToast()
  const active = useAdminResource(`rubrics-active|${task}`, (signal) => fetchActiveRubrics(task, signal))
  const drafts = useAdminResource(`rubrics-drafts|${task}`, (signal) => fetchDraftRubrics(task, signal))
  const [editing, setEditing] = useState<{ body: RubricRequest; persisted: boolean } | null>(null)
  const [viewing, setViewing] = useState<Rubric | null>(null)
  function reload() { active.reload(); drafts.reload() }
  const activeRubrics = active.data ?? []

  return <>
    {active.status !== 'success' || activeRubrics.length === 0 ? (
      <section aria-label="Đang dùng" className="adm-block">
        <h2 className="rb-title">Đang dùng</h2>
        {active.status === 'loading' ? <AdminLoading label="Đang tải rubric đang dùng…" /> : null}
        {active.status === 'error' ? <AdminError message={active.error!} onRetry={active.reload} /> : null}
        {active.status === 'success' ? <p className="adm-muted">Chưa có rubric đang dùng cho Task này.</p> : null}
      </section>
    ) : null}

    {activeRubrics.map((rubric) => {
      const nextDraft = !RUBRIC_VERSIONS_ENABLED && drafts.status === 'success' ? rubricDraft(rubric, [...activeRubrics, ...(drafts.data ?? [])]) : null
      return <section aria-label={`Rubric đang dùng ${rubric.code}`} className="adm-block" key={`${rubric.code}-${rubric.version}`}>
        <header className="rb-head">
          <div className="rb-head__text">
            <h2 className="rb-title">{rubric.code} · Phiên bản {rubric.version}</h2>
            <span className="adm-badge adm-badge--ok">Đang dùng</span>
            <span className="adm-muted rb-meta">{rubric.criteria.length} tiêu chí · {rubric.examples.length} bài mẫu</span>
          </div>
          <div className="rb-head__actions">
            <button className="adm-btn" onClick={() => setViewing(rubric)} type="button"><Eye aria-hidden="true" size={16} />Xem chi tiết</button>
            {RUBRIC_VERSIONS_ENABLED ? <RubricVersionDraftAction rubric={rubric} disabled={!!editing} onCreate={(body) => setEditing({ body, persisted: false })} /> : (
              <div className="rb-draft-action">
                {nextDraft ? <p className="adm-muted">Bản tiếp theo: {nextDraft.version} (theo các phiên bản đã tải).</p> : null}
                <button className="adm-btn adm-btn--primary" disabled={!nextDraft || !!editing} onClick={() => { if (nextDraft) setEditing({ body: nextDraft, persisted: false }) }} type="button">
                  <PencilLine aria-hidden="true" size={16} />Tạo bản nháp từ bản đang dùng
                </button>
              </div>
            )}
          </div>
        </header>
        <RubricCriteriaGrid rubric={rubric} />
      </section>
    })}

    <section aria-label="Bản nháp" className="adm-block">
      <h2 className="rb-title">Bản nháp<span className="rb-count">{drafts.data?.length ?? 0}</span></h2>
      {drafts.status === 'loading' ? <AdminLoading label="Đang tải bản nháp…" /> : null}
      {drafts.status === 'error' ? <AdminError message={drafts.error!} onRetry={drafts.reload} /> : null}
      {drafts.status === 'success' ? (
        <div className="adm-table-wrap rb-drafts">
          <table aria-label="Bản nháp" className="adm-table">
            <thead>
              <tr>
                <th className="adm-stt" scope="col">STT</th>
                <th scope="col">Rubric</th>
                <th scope="col">Phiên bản</th>
                <th scope="col">Tiêu chí</th>
                <th className="adm-col-actions" scope="col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {!drafts.data?.length ? <tr><td className="adm-muted rb-empty" colSpan={5}>Chưa có bản nháp nào.</td></tr> : drafts.data.map((rubric, index) => (
                <tr key={`${rubric.code}-${rubric.version}`}>
                  <td className="adm-stt">{index + 1}</td>
                  <td><code>{rubric.code}</code></td>
                  <td>Bản nháp {rubric.version}</td>
                  <td>{rubric.criteria.length} tiêu chí · {rubric.examples.length} bài mẫu</td>
                  <td className="adm-col-actions">
                    <AdminRowMenu disabled={!!editing} label={`Hành động của bản nháp ${rubric.version}`} items={[
                      { key: 'edit', label: 'Sửa bản nháp', ariaLabel: `Sửa bản nháp ${rubric.version}`, icon: <Pencil aria-hidden="true" size={16} />, onSelect: () => setEditing({ body: rubricRequest(rubric), persisted: true }) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>

    {viewing ? (
      <AdminModal badge={<span className="adm-badge adm-badge--ok">Đang dùng</span>} onClose={() => setViewing(null)} size="wide" title={`${viewing.code} · Phiên bản ${viewing.version}`}>
        {() => <RubricView rubric={viewing} />}
      </AdminModal>
    ) : null}
    {editing ? <AdminDrawer title={`${editing.body.code} · Bản nháp ${editing.body.version}`} size="lg" onClose={() => setEditing(null)}>
      {(close) => <RubricEditor key={`${editing.body.code}-${editing.body.version}`} initial={editing.body} persisted={editing.persisted} onSaved={reload} onCancel={close} onActivated={() => { toast({ title: 'Thành công', description: 'Đã kích hoạt rubric.', tone: 'success' }); reload(); close() }} />}
    </AdminDrawer> : null}
  </>
}

export function RubricsPage() {
  const [params, setParams] = useSearchParams()
  const task: WritingTask = params.get('task') === 'SPEAKING' ? 'SPEAKING' : params.get('task') === 'TASK_2' ? 'TASK_2' : 'TASK_1'
  return <AdminPage plain title="Rubric chấm bài">
    <nav aria-label="Chọn kỹ năng" className="rb-seg">
      {(['TASK_1', 'TASK_2', 'SPEAKING'] as const).map((value) => (
        <button aria-pressed={task === value} className={task === value ? 'is-active' : undefined} key={value} onClick={() => setParams((current) => { const next = new URLSearchParams(current); next.set('task', value); return next })} type="button">
          {value === 'SPEAKING' ? 'Speaking' : `Writing Task ${value === 'TASK_1' ? '1' : '2'}`}
        </button>
      ))}
    </nav>
    <TaskRubrics key={task} task={task} />
  </AdminPage>
}
