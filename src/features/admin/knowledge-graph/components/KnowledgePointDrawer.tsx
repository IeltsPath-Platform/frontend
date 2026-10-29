import { useState, type FormEvent } from 'react'
import { useToast } from '@/components/toast/toastContext'
import { AdminDrawer } from '../../components/AdminLayer'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminError } from '../../lib/useAdminError'
import { useAdminResource } from '../../lib/useAdminResource'
import type { TopicOption } from '../../lessons/types'
import {
  createKnowledgePoint, fetchKnowledgePoints, fetchPrerequisites, replacePrerequisites, updateKnowledgePoint,
} from '../api/knowledgePointApi'
import {
  CEFR_OPTIONS, EMPTY_FORM, KIND_OPTIONS, LEARNING_TYPE_OPTIONS, SKILL_OPTIONS, formOf, formProblem, requestOf,
  type KnowledgePointForm,
} from '../lib/knowledgePointForm'
import type { KnowledgePoint, TreeNode } from '../types'
import { ChoiceChips } from './ChoiceChips'
import { PrerequisitePicker } from './PrerequisitePicker'

interface Loaded {
  /** Every point, for the ones that can be a prerequisite and for the whole record of the point being edited. */
  points: KnowledgePoint[]
  prerequisiteIds: string[]
}

const sameIds = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((id) => b.includes(id))

function Form({ point, loaded, topics, onSaved, onClose }: {
  point: KnowledgePoint | null
  loaded: Loaded
  topics: readonly TopicOption[]
  onSaved: () => void
  onClose: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<KnowledgePointForm>(point ? formOf(point) : EMPTY_FORM)
  const [prerequisites, setPrerequisites] = useState(loaded.prerequisiteIds)
  const [, setError] = useAdminError()
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof KnowledgePointForm>(field: K) => (value: KnowledgePointForm[K]) => setForm((current) => ({ ...current, [field]: value }))
  const text = (field: keyof KnowledgePointForm) => ({ onChange: (event: { target: { value: string } }) => set(field)(event.target.value), value: form[field] })
  const candidates = loaded.points.filter((item) => item.id !== point?.id)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const problem = formProblem(form)
    if (problem) { setError(problem); return }
    setSaving(true)
    setError(null)
    let id = point?.id
    try {
      const saved = point ? await updateKnowledgePoint(point.id, requestOf(form)) : await createKnowledgePoint(requestOf(form))
      id = saved.id
    } catch (reason) {
      setError(adminErrorMessage(reason))
      setSaving(false)
      return
    }
    try {
      if (id && !sameIds(prerequisites, loaded.prerequisiteIds)) await replacePrerequisites(id, prerequisites)
    } catch (reason) {
      setError(`Đã lưu điểm kiến thức nhưng chưa lưu được các điểm cần học trước: ${adminErrorMessage(reason)}`)
      onSaved()
      setSaving(false)
      return
    }
    toast({ title: 'Thành công', description: point ? 'Đã cập nhật điểm kiến thức.' : 'Đã tạo điểm kiến thức.', tone: 'success' })
    onSaved()
    onClose()
  }

  return (
    <form aria-label={point ? `Sửa ${point.code}` : 'Điểm kiến thức mới'} noValidate onSubmit={(event) => void submit(event)}>
      <div className="adm-filters">
        <label className="adm-field">
          <span>Mã<span aria-hidden="true" className="adm-required" /></span>
          <input aria-required="true" className="adm-input" placeholder="R55_SCANNING" {...text('code')} />
        </label>
        <label className="adm-field kg-grow">
          <span>Tên<span aria-hidden="true" className="adm-required" /></span>
          <input aria-required="true" className="adm-input" {...text('name')} />
        </label>
      </div>
      <label className="adm-field">
        <span>Chủ đề<span aria-hidden="true" className="adm-required" /></span>
        <select aria-required="true" className="adm-select" {...text('topicId')}>
          <option value="">Chọn chủ đề</option>
          {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name} ({topic.code})</option>)}
        </select>
      </label>
      <ChoiceChips clearable label="Kỹ năng" onChange={set('skill')} options={SKILL_OPTIONS} value={form.skill} />
      <ChoiceChips label="Loại" onChange={set('kind')} options={KIND_OPTIONS} required value={form.kind} />
      <ChoiceChips label="Kiểu học" onChange={set('learningType')} options={LEARNING_TYPE_OPTIONS} required value={form.learningType} />
      <ChoiceChips clearable label="Cấp CEFR" onChange={set('cefrLevel')} options={CEFR_OPTIONS} value={form.cefrLevel} />
      <label className="adm-field">
        <span>Can-do<span aria-hidden="true" className="adm-required" /></span>
        <textarea aria-required="true" className="adm-textarea kg-textarea" {...text('canDo')} />
      </label>
      <label className="adm-field">
        <span>Trong phạm vi</span>
        <textarea className="adm-textarea kg-textarea" {...text('scopeIn')} />
      </label>
      <label className="adm-field">
        <span>Ngoài phạm vi</span>
        <textarea className="adm-textarea kg-textarea" {...text('scopeOut')} />
      </label>
      <label className="adm-field">
        <span>Mô tả</span>
        <textarea className="adm-textarea kg-textarea" {...text('description')} />
      </label>
      <PrerequisitePicker candidates={candidates} onChange={setPrerequisites} selected={prerequisites} />
      <div className="adm-form-footer">
        <button className="adm-btn" disabled={saving} onClick={onClose} type="button">Đóng</button>
        <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">Lưu</button>
      </div>
    </form>
  )
}

/**
 * Creating a knowledge point, or editing `node`, in a drawer on the right. The whole record and the points it needs are
 * read first: the tree leaves out the description, and saving the points it needs replaces the list, so it must be whole.
 */
export function KnowledgePointDrawer({ node, topics, onSaved, onClose }: {
  /** The point to edit; null to create one. */
  node: TreeNode | null
  topics: readonly TopicOption[]
  onSaved: () => void
  onClose: () => void
}) {
  const loaded = useAdminResource<Loaded>(`point|${node?.id ?? 'new'}`, async (signal) => {
    const [points, prerequisites] = await Promise.all([
      fetchKnowledgePoints(null, signal),
      node ? fetchPrerequisites(node.id, signal) : Promise.resolve([]),
    ])
    return { points, prerequisiteIds: prerequisites.map((item) => item.id) }
  })
  const point = node ? loaded.data?.points.find((item) => item.id === node.id) ?? null : null

  return (
    <AdminDrawer description={node?.name} onClose={onClose} size="lg" title={node ? `Sửa ${node.code}` : 'Tạo điểm kiến thức'}>
      {(close) => {
        if (loaded.status === 'error') return <AdminError message={loaded.error ?? 'Không tải được điểm kiến thức.'} onRetry={loaded.reload} />
        if (loaded.status !== 'success' || !loaded.data) return <AdminLoading label="Đang tải điểm kiến thức…" />
        if (node && !point) return <AdminError message="Không tìm thấy điểm kiến thức này nữa. Hãy tải lại trang." onRetry={loaded.reload} />
        return <Form loaded={loaded.data} onClose={close} onSaved={onSaved} point={point} topics={topics} />
      }}
    </AdminDrawer>
  )
}
