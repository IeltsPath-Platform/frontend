import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { useToast } from '@/components/toast/toastContext'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { AdminDrawer, AdminModal } from '../../components/AdminLayer'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { useAdminErrorToast } from '../../lib/useAdminError'
import { AdminPage } from '../../pages/AdminPage'
import { addSection, createDraftVersion, deleteSection, getPackage, reorderSections, updateSection } from '../api/packageApi'
import { SectionEditor } from '../components/SectionEditor'
import { VersionPicker } from '../components/VersionPicker'
import { PackagePreview } from '../components/PackagePreview'
import { PublishPanel } from '../components/PublishPanel'
import { SectionContentEditor } from '../components/SectionContentEditor'
import { SectionQuestionsEditor } from '../components/SectionQuestionsEditor'
import { PACKAGE_STATUS_LABEL, PACKAGE_TYPE_LABEL, SECTION_SKILL_LABEL, packageError, partLabel } from '../lib/packageLabels'
import type { ContentPackage, PackageSection, SectionRequest } from '../types'
import '../packages.css'
import { listOpenSectionDrafts } from '../api/sectionDraftApi'
import type { SectionQuestionDraft } from '../../ai-drafts/types'

const SKILL_ORDER = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const

/** `onClose` shows the editor in a side drawer over the catalog instead of as a page of its own. */
function PackageEditor({ packageId, onClose }: { packageId: string; onClose?: () => void }) {
  const resource = useAdminResource(`author-package:${packageId}`, (signal) => getPackage(packageId, signal))
  const [search, setSearch] = useSearchParams()
  const { confirm, confirmDialog } = useAdminConfirm()
  const [shown, setShown] = useState<ContentPackage | null>(null)
  const [editing, setEditing] = useState<{ id: string; versionId: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const notifyError = useAdminErrorToast()
  const { toast } = useToast()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewRevision, setPreviewRevision] = useState(0)
  // Sections start collapsed; only the ones the author opened are tracked.
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set())
  // The skill groups start collapsed too.
  const [openedGroups, setOpenedGroups] = useState<ReadonlySet<string>>(() => new Set())
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  if (resource.status === 'success' && resource.data !== shown) setShown(resource.data)
  const pkg = resource.status === 'success' ? resource.data : shown
  const requested = search.get('version')
  const selected = requested ? pkg?.versions.find((version) => version.id === requested) :
    pkg?.versions.find((version) => version.status === 'DRAFT') ?? pkg?.versions.find((version) => version.id === pkg.currentPublishedVersionId) ?? pkg?.versions.at(-1)
  const selectedId = selected?.id
  const [openSectionDrafts, setOpenSectionDrafts] = useState<SectionQuestionDraft[]>([])
  const [sectionDraftRefresh, setSectionDraftRefresh] = useState(0)
  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    void listOpenSectionDrafts(selectedId, controller.signal).then(setOpenSectionDrafts).catch(() => {
      if (!controller.signal.aborted) setOpenSectionDrafts([])
    })
    return () => controller.abort()
  }, [selectedId, sectionDraftRefresh])
  useEffect(() => {
    if (!requested && selectedId) setSearch((previous) => { const next = new URLSearchParams(previous); next.set('version', selectedId); return next }, { replace: true })
  }, [requested, selectedId, setSearch])
  const locked = busy || resource.status !== 'success'
  const readOnly = selected?.status !== 'DRAFT'
  if (editing && resource.status === 'success' && (editing.versionId !== selectedId || readOnly)) setEditing(null)
  const sections = [...(selected?.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))

  const editingSection = editing && editing.id !== 'new' ? sections.find((section) => section.id === editing.id) : undefined
  function closeEditor() { setEditing(null) }
  // The sections are listed under their skill, in the order of the exam; a section with no skill chosen comes last.
  const groups = [...SKILL_ORDER, null].map((skill) => ({ key: skill ?? 'NONE', skill, items: sections.filter((section) => (section.skill ?? null) === skill) })).filter((group) => group.items.length > 0)
  const allFolded = groups.every((group) => !openedGroups.has(group.key))
  function toggleSection(id: string) {
    setOpened((previous) => { const next = new Set(previous); if (!next.delete(id)) next.add(id); return next })
  }
  function toggleGroup(key: string) {
    setOpenedGroups((previous) => { const next = new Set(previous); if (!next.delete(key)) next.add(key); return next })
  }
  function selectVersion(id: string) {
    if (locked || editing) return
    setSearch((previous) => { const next = new URLSearchParams(previous); next.set('version', id); return next })
  }
  async function mutate(action: () => Promise<unknown>, message: string, closeEditor = false) {
    if (locked) return false
    setBusy(true)
    try {
      await action()
      if (closeEditor) setEditing(null)
      toast({ title: 'Thành công', description: message, tone: 'success' })
      setPreviewRevision((revision) => revision + 1)
      resource.reload()
      return true
    } catch (reason) { notifyError(packageError(reason)); return false }
    finally { setBusy(false) }
  }
  async function mutateContent(action: () => Promise<unknown>, message: string) {
    if (readOnly || editing) return false
    return mutate(action, message)
  }
  async function save(body: SectionRequest, section?: PackageSection) {
    if (!selected || readOnly) return
    await mutate(() => section ? updateSection(packageId, selected.id, section.id, body) : addSection(packageId, selected.id, body), 'Đã lưu phần.', true)
  }
  async function remove(section: PackageSection) {
    if (!selected || readOnly || locked || editing) return
    if (!(await confirm({
      title: 'Xóa phần này?',
      message: `Xóa phần “${section.title}”? Các câu hỏi và liên kết tài nguyên trong phần sẽ được gỡ khỏi phiên bản; tài nguyên gốc được giữ lại.`,
      confirmLabel: 'Xóa phần',
      tone: 'danger',
    }))) return
    void mutate(() => deleteSection(packageId, selected.id, section.id), 'Đã xóa phần.')
  }
  // A section swaps places with its neighbour of the same skill, so the order of the other skills is untouched.
  function move(section: PackageSection, delta: number) {
    if (!selected || readOnly || locked || editing) return
    const siblings = sections.filter((other) => (other.skill ?? null) === (section.skill ?? null))
    const neighbour = siblings[siblings.indexOf(section) + delta]
    if (!neighbour) return
    const ids = sections.map((other) => other.id)
    const index = ids.indexOf(section.id)
    const other = ids.indexOf(neighbour.id)
    ;[ids[index], ids[other]] = [ids[other]!, ids[index]!]
    void mutate(() => reorderSections(packageId, selected.id, ids), 'Đã đổi thứ tự phần.')
  }
  const subtitle = pkg ? `${pkg.code} · ${PACKAGE_TYPE_LABEL[pkg.packageType]} · ${pkg.accessLevel === 'FREE' ? 'Miễn phí' : 'Premium'}` : undefined
  const body = <>
    <div className="adm-package-workspace adm-pe">
      {confirmDialog}
      {resource.status === 'loading' ? <AdminLoading label="Đang tải gói…" /> : null}
      {resource.status === 'error' ? <AdminError message={resource.error!} onRetry={resource.reload} /> : null}
      {pkg ? <>
        <VersionPicker status={PACKAGE_STATUS_LABEL[pkg.status]} versions={pkg.versions} selectedId={selected?.id ?? ''} locked={locked || !!editing} onChange={selectVersion} onCreate={() => {
          if (editing || pkg.versions.some((version) => version.status === 'DRAFT')) return
          void mutate(async () => {
            const draft = await createDraftVersion(packageId)
            if (active.current) setSearch((previous) => { const next = new URLSearchParams(previous); next.set('version', draft.id); return next })
          }, pkg.versions.length ? 'Đã tạo bản nháp từ bản đang dùng.' : 'Đã tạo bản nháp trống.')
        }} />
        {!pkg.versions.length ? <AdminEmpty title="Gói chưa có phiên bản">Tạo bản nháp mới để thêm các phần.</AdminEmpty> : null}
        {requested && !selected && resource.status === 'success' ? <AdminError message="Không tìm thấy phiên bản đã chọn trong gói này. Chọn lại phiên bản bên trên." /> : null}
        {selected ? <section aria-label={`Nội dung bản ${selected.versionNumber}`} className="adm-pe-content">
          <h2 className="adm-pe-version">Bản {selected.versionNumber} · {PACKAGE_STATUS_LABEL[selected.status]}</h2>
          {readOnly ? <p className="adm-alert">Phiên bản này chỉ xem. Chọn hoặc tạo bản nháp để sửa.</p> : null}
          <div className="adm-sec__head">
            <h3 className="adm-sec__title">Các phần<span className="adm-count">{sections.length}</span></h3>
            <div className="adm-pe-tools">
              {sections.length > 1 ? <button className="adm-btn adm-btn--small adm-btn--noicon" type="button" onClick={() => { setOpenedGroups(allFolded ? new Set(groups.map((group) => group.key)) : new Set()); if (!allFolded) setOpened(new Set()) }}>{allFolded ? 'Mở tất cả' : 'Thu gọn tất cả'}</button> : null}
              {!readOnly ? <button className="adm-btn adm-btn--small" type="button" disabled={locked || !!editing} onClick={() => setEditing({ id: 'new', versionId: selected.id })}><Plus size={14} aria-hidden="true" /> Thêm phần</button> : null}
            </div>
          </div>
          {editing?.versionId === selected.id && !readOnly && (editing.id === 'new' || editingSection) ? <AdminModal onClose={closeEditor} stacked top title={editingSection ? 'Sửa phần' : 'Thêm phần'}>
            {(close) => <>
              <SectionEditor section={editingSection} siblings={sections.filter((section) => section.id !== editingSection?.id)} sortOrder={editingSection?.sortOrder ?? Math.max(0, ...sections.map((section) => section.sortOrder)) + 1} busy={locked} onSave={(body) => save(body, editingSection)} onCancel={close} />
            </>}
          </AdminModal> : null}
          {!sections.length ? <AdminEmpty title="Phiên bản chưa có phần nào">{readOnly ? 'Phiên bản này không có phần để hiển thị.' : 'Thêm phần đầu tiên để bắt đầu soạn đề.'}</AdminEmpty> : null}
          <div className="adm-pe-groups">
            {groups.map((group) => {
              const groupFolded = !openedGroups.has(group.key)
              const label = group.skill ? SECTION_SKILL_LABEL[group.skill] : 'Chưa chọn kỹ năng'
              const questionTotal = group.items.reduce((sum, section) => sum + section.questions.length, 0)
              return <section className={`adm-pe-group${groupFolded ? ' is-folded' : ''}`} aria-label={`Kỹ năng ${label}`} key={group.key}>
                <button aria-expanded={!groupFolded} aria-label={`${groupFolded ? 'Mở' : 'Thu gọn'} nhóm ${label}`} className="adm-pe-group__toggle" type="button" onClick={() => toggleGroup(group.key)}>
                  <ChevronRight aria-hidden="true" className="adm-pe-section__chevron" size={18} />
                  <span className="adm-pe-group__title">{label}</span>
                  <span className="adm-pe-chip">{group.items.length} phần</span>
                  <span className="adm-pe-chip adm-pe-chip--count">{questionTotal} câu</span>
                </button>
                <div className="adm-pe-sections" hidden={groupFolded}>
            {group.items.map((section, index) => {
              const isFolded = !opened.has(section.id)
              return <article className={`adm-pe-section${isFolded ? ' is-folded' : ''}`} aria-label={section.title} key={section.id}>
                <header className="adm-pe-section__head">
                  <button aria-expanded={!isFolded} aria-label={`${isFolded ? 'Mở' : 'Thu gọn'} ${section.title}`} className="adm-pe-section__toggle" type="button" onClick={() => toggleSection(section.id)}>
                    <ChevronRight aria-hidden="true" className="adm-pe-section__chevron" size={18} />
                    <span aria-hidden="true" className="adm-pe-section__no">{index + 1}</span>
                    <span className="adm-pe-section__title">{section.title}</span>
                  </button>
                  <div className="adm-pe-section__meta">
                    <span className="adm-pe-chip">{section.skill ? SECTION_SKILL_LABEL[section.skill] : 'Chưa chọn kỹ năng'}</span>
                    {section.partNo ? <span className="adm-pe-chip">{partLabel(section.skill, section.partNo)}</span> : null}
                    {section.timeLimitSeconds != null ? <span className="adm-pe-chip">{section.timeLimitSeconds / 60} phút</span> : null}
                    <span className="adm-pe-chip adm-pe-chip--count">{section.questions.length} câu</span>
                  </div>
                  {!readOnly ? <div className="adm-pe-section__tools">
                    <button className="adm-pe-icon" type="button" disabled={locked || !!editing || index === 0} aria-label={`Đưa ${section.title} lên`} onClick={() => move(section, -1)}><ArrowUp size={16} aria-hidden="true" /></button>
                    <button className="adm-pe-icon" type="button" disabled={locked || !!editing || index === group.items.length - 1} aria-label={`Đưa ${section.title} xuống`} onClick={() => move(section, 1)}><ArrowDown size={16} aria-hidden="true" /></button>
                    <button className="adm-pe-icon" type="button" disabled={locked || !!editing} onClick={() => setEditing({ id: section.id, versionId: selected.id })} aria-label={`Sửa ${section.title}`}><Pencil size={16} aria-hidden="true" /></button>
                    <button className="adm-pe-icon adm-pe-icon--danger" type="button" disabled={locked || !!editing} onClick={() => remove(section)} aria-label={`Xóa ${section.title}`}><Trash2 size={16} aria-hidden="true" /></button>
                  </div> : null}
                </header>
                <div className="adm-pe-section__body" hidden={isFolded}>
                  {section.instructions ? <p className="adm-pe-section__instructions">{section.instructions}</p> : null}
                  <SectionContentEditor packageId={packageId} versionId={selected.id} section={section} disabled={locked || readOnly || !!editing} onSaved={() => {}} onMutate={mutateContent} />
                  <SectionQuestionsEditor packageId={packageId} versionId={selected.id} section={section} packageType={pkg.packageType} disabled={locked || readOnly || !!editing} openDraft={openSectionDrafts.find((draft) => draft.request.sectionId === section.id)} onSaved={() => setSectionDraftRefresh((value) => value + 1)} onMutate={mutateContent} />
                </div>
              </article>
            })}
                </div>
              </section>
            })}
          </div>
          <PublishPanel key={selected.id} packageId={packageId} version={selected} packageType={pkg.packageType} disabled={locked || !!editing} onMutate={mutateContent} onPreview={() => setPreviewOpen(true)} />
          {previewOpen ? <AdminModal onClose={() => setPreviewOpen(false)} size="wide" stacked title="Xem trước gói" description={pkg.title}>
            {(close) => <PackagePreview embedded key={`${selected.id}:${previewRevision}`} packageId={packageId} versionId={selected.id} onClose={close} />}
          </AdminModal> : null}
        </section> : null}
      </> : null}
    </div>
  </>
  if (onClose) {
    return <AdminDrawer title={pkg?.title ?? 'Chỉnh sửa gói'} description={subtitle} size="xl" onClose={onClose}>{() => body}</AdminDrawer>
  }
  return <AdminPage title={pkg?.title ?? 'Soạn gói câu hỏi'} subtitle={subtitle} actions={<Link className="adm-btn" to="/content-author/packages">Đề & gói câu hỏi</Link>}>{body}</AdminPage>
}

export function PackageEditorPage() {
  const { packageId } = useParams<{ packageId: string }>()
  const parsed = z.guid().safeParse(packageId)
  return parsed.success ? <PackageEditor key={parsed.data} packageId={parsed.data} /> : <AdminPage title="Soạn gói câu hỏi"><AdminError message="ID gói không hợp lệ (cần UUID)." /><Link className="adm-btn" to="/content-author/packages">Đề & gói câu hỏi</Link></AdminPage>
}

/** The editor of one package in a side drawer, opened over the catalog. */
export function PackageEditorDrawer({ packageId, onClose }: { packageId: string; onClose: () => void }) {
  return <PackageEditor key={packageId} packageId={packageId} onClose={onClose} />
}
