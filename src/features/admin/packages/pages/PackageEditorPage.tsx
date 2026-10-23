import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { addSection, createDraftVersion, deleteSection, getPackage, reorderSections, updateSection } from '../api/packageApi'
import { SectionEditor } from '../components/SectionEditor'
import { VersionPicker } from '../components/VersionPicker'
import { PACKAGE_STATUS_LABEL, PACKAGE_TYPE_LABEL, SECTION_SKILL_LABEL, packageError } from '../lib/packageLabels'
import type { ContentPackage, PackageSection, SectionRequest } from '../types'
import '../packages.css'

function PackageEditor({ packageId }: { packageId: string }) {
  const resource = useAdminResource(`author-package:${packageId}`, (signal) => getPackage(packageId, signal))
  const [search, setSearch] = useSearchParams()
  const [shown, setShown] = useState<ContentPackage | null>(null)
  const [editing, setEditing] = useState<{ id: string; versionId: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  if (resource.status === 'success' && resource.data !== shown) setShown(resource.data)
  const pkg = resource.status === 'success' ? resource.data : shown
  const requested = search.get('version')
  const selected = requested ? pkg?.versions.find((version) => version.id === requested) :
    pkg?.versions.find((version) => version.status === 'DRAFT') ?? pkg?.versions.find((version) => version.id === pkg.currentPublishedVersionId) ?? pkg?.versions.at(-1)
  const selectedId = selected?.id
  useEffect(() => {
    if (!requested && selectedId) setSearch((previous) => { const next = new URLSearchParams(previous); next.set('version', selectedId); return next }, { replace: true })
  }, [requested, selectedId, setSearch])
  const locked = busy || resource.status !== 'success'
  const readOnly = selected?.status !== 'DRAFT'
  if (editing && resource.status === 'success' && (editing.versionId !== selectedId || readOnly)) setEditing(null)
  const sections = [...(selected?.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))

  function selectVersion(id: string) {
    if (locked || editing) return
    setError(null); setNotice(null)
    setSearch((previous) => { const next = new URLSearchParams(previous); next.set('version', id); return next })
  }
  async function mutate(action: () => Promise<unknown>, message: string, closeEditor = false) {
    if (locked) return
    setBusy(true); setError(null); setNotice(null)
    try {
      await action()
      if (closeEditor) setEditing(null)
      setNotice(message)
      resource.reload()
    } catch (reason) { setError(packageError(reason)) }
    finally { setBusy(false) }
  }
  async function save(body: SectionRequest, section?: PackageSection) {
    if (!selected || readOnly) return
    await mutate(() => section ? updateSection(packageId, selected.id, section.id, body) : addSection(packageId, selected.id, body), 'Đã lưu phần.', true)
  }
  function remove(section: PackageSection) {
    if (!selected || readOnly || locked || editing) return
    if (!window.confirm(`Xóa phần “${section.title}”? Các câu hỏi và liên kết tài nguyên trong phần sẽ được gỡ khỏi phiên bản; tài nguyên gốc được giữ lại.`)) return
    void mutate(() => deleteSection(packageId, selected.id, section.id), 'Đã xóa phần.')
  }
  function move(index: number, delta: number) {
    if (!selected || readOnly || locked || editing) return
    const ids = sections.map((section) => section.id)
    const other = index + delta
    if (other < 0 || other >= ids.length) return
    ;[ids[index], ids[other]] = [ids[other]!, ids[index]!]
    void mutate(() => reorderSections(packageId, selected.id, ids), 'Đã đổi thứ tự phần.')
  }
  return <AdminPage title={pkg?.title ?? 'Soạn gói câu hỏi'} subtitle={pkg ? `${pkg.code} · ${PACKAGE_TYPE_LABEL[pkg.packageType]} · ${pkg.accessLevel === 'FREE' ? 'Miễn phí' : 'Premium'}` : undefined} actions={<Link className="adm-btn" to="/content-author/packages">Đề & gói câu hỏi</Link>}>
    <div className="adm-package-workspace">
      {resource.status === 'loading' ? <AdminLoading label="Đang tải gói…" /> : null}
      {resource.status === 'error' ? <AdminError message={resource.error!} onRetry={resource.reload} /> : null}
      {pkg ? <>
        <div className="adm-package-actions"><span className="adm-badge">{PACKAGE_STATUS_LABEL[pkg.status]}</span><code>{pkg.code}</code></div>
        <VersionPicker versions={pkg.versions} selectedId={selected?.id ?? ''} locked={locked || !!editing} onChange={selectVersion} onCreate={() => {
          if (editing || pkg.versions.some((version) => version.status === 'DRAFT')) return
          void mutate(async () => {
            const draft = await createDraftVersion(packageId, '{}')
            setSearch((previous) => { const next = new URLSearchParams(previous); next.set('version', draft.id); return next })
          }, 'Đã tạo bản nháp trống.')
        }} />
        {error ? <div className="adm-alert adm-alert--error" role="alert">{error}<div><button className="adm-btn" type="button" disabled={locked} onClick={resource.reload}>Tải lại gói</button></div></div> : null}
        {notice ? <p role="status">{notice}</p> : null}
        {!pkg.versions.length ? <AdminEmpty title="Gói chưa có phiên bản">Tạo bản nháp mới để thêm các phần.</AdminEmpty> : null}
        {requested && !selected && resource.status === 'success' ? <AdminError message="Không tìm thấy phiên bản đã chọn trong gói này. Chọn lại phiên bản bên trên." /> : null}
        {selected ? <section aria-label={`Nội dung bản ${selected.versionNumber}`}>
          <h2>Bản {selected.versionNumber} · {PACKAGE_STATUS_LABEL[selected.status]}</h2>
          {readOnly ? <p className="adm-alert">Phiên bản này chỉ xem. Chọn hoặc tạo bản nháp để sửa.</p> : null}
          <h3>Các phần ({sections.length})</h3>
          {!sections.length ? <AdminEmpty title="Phiên bản chưa có phần nào">{readOnly ? 'Phiên bản này không có phần để hiển thị.' : 'Thêm phần đầu tiên để bắt đầu soạn đề.'}</AdminEmpty> : null}
          {sections.map((section, index) => <article className="adm-package-section" aria-label={section.title} key={section.id}>
            <h3>{section.title}</h3>
            <p className="adm-muted">{section.skill ? SECTION_SKILL_LABEL[section.skill] : 'Chưa chọn kỹ năng'}{section.partNo ? ` · Phần ${section.partNo}` : ''}{section.timeLimitSeconds != null ? ` · ${section.timeLimitSeconds / 60} phút` : ''}</p>
            {section.instructions ? <p className="adm-package-section__instructions">{section.instructions}</p> : null}
            {!readOnly ? <div className="adm-package-actions">
              <button className="adm-btn" type="button" disabled={locked || !!editing || index === 0} aria-label={`Đưa ${section.title} lên`} onClick={() => move(index, -1)}><ArrowUp size={16} aria-hidden="true" /></button>
              <button className="adm-btn" type="button" disabled={locked || !!editing || index === sections.length - 1} aria-label={`Đưa ${section.title} xuống`} onClick={() => move(index, 1)}><ArrowDown size={16} aria-hidden="true" /></button>
              <button className="adm-btn" type="button" disabled={locked || !!editing} onClick={() => { setError(null); setNotice(null); setEditing({ id: section.id, versionId: selected.id }) }} aria-label={`Sửa ${section.title}`}><Pencil size={16} aria-hidden="true" /> Sửa phần</button>
              <button className="adm-btn adm-btn--danger" type="button" disabled={locked || !!editing} onClick={() => remove(section)} aria-label={`Xóa ${section.title}`}><Trash2 size={16} aria-hidden="true" /> Xóa phần</button>
            </div> : null}
            {editing?.versionId === selected.id && editing.id === section.id && !readOnly ? <SectionEditor section={section} sortOrder={section.sortOrder} busy={locked} onSave={(body) => save(body, section)} onCancel={() => { setEditing(null); setError(null) }} /> : null}
            <details><summary>Câu hỏi hiện có ({section.questions.length})</summary>
              <p className="adm-muted">Hiện chỉ có ID phiên bản câu hỏi, thứ tự và điểm. Nội dung câu hỏi: Chờ backend.</p>
              <ol>{section.questions.map((question) => <li key={question.id}><span className="adm-package-question-id">{question.questionVersionId}</span> · Thứ tự {question.sortOrder} · {question.maxScore} điểm</li>)}</ol>
            </details>
            <div className="adm-package-actions">{['Soạn câu hỏi', 'Đoạn văn', 'Audio', 'Tải audio'].map((label) => <button className="adm-btn" key={label} disabled title="Chờ backend" type="button">{label} · Chờ backend</button>)}</div>
          </article>)}
          {!readOnly ? <div className="adm-package-section">
            <button className="adm-btn" type="button" disabled={locked || !!editing} onClick={() => { setError(null); setNotice(null); setEditing({ id: 'new', versionId: selected.id }) }}><Plus size={16} aria-hidden="true" /> Thêm phần</button>
            {editing?.versionId === selected.id && editing.id === 'new' ? <SectionEditor sortOrder={Math.max(0, ...sections.map((section) => section.sortOrder)) + 1} busy={locked} onSave={(body) => save(body)} onCancel={() => { setEditing(null); setError(null) }} /> : null}
          </div> : null}
        </section> : null}
      </> : null}
    </div>
  </AdminPage>
}

export function PackageEditorPage() {
  const { packageId } = useParams<{ packageId: string }>()
  const parsed = z.uuid().safeParse(packageId)
  return parsed.success ? <PackageEditor key={parsed.data} packageId={parsed.data} /> : <AdminPage title="Soạn gói câu hỏi"><AdminError message="ID gói không hợp lệ (cần UUID)." /><Link className="adm-btn" to="/content-author/packages">Đề & gói câu hỏi</Link></AdminPage>
}
