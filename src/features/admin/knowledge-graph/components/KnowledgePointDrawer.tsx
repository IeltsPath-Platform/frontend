import { useEffect, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { useToast } from '@/components/toast/toastContext'
import { AdminField } from '../../components/AdminField'
import { AdminDrawer } from '../../components/AdminLayer'
import { requiredChoice, requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminError } from '../../lib/useAdminError'
import { useAdminResource } from '../../lib/useAdminResource'
import type { TopicOption } from '../../lessons/types'
import {
  createKnowledgePoint, fetchKnowledgePoints, fetchPrerequisites, replacePrerequisites, updateKnowledgePoint,
} from '../api/knowledgePointApi'
import {
  CEFR_OPTIONS, CODE_PATTERN, CODE_PATTERN_MESSAGE, EMPTY_FORM, KIND_OPTIONS, LEARNING_TYPE_OPTIONS, SKILL_OPTIONS, formOf, requestOf,
  type KnowledgePointForm,
} from '../lib/knowledgePointForm'
import type { CreateKnowledgePointRequest, KnowledgePoint, TreeNode } from '../types'
import { ChoiceChips } from './ChoiceChips'
import { PrerequisitePicker } from './PrerequisitePicker'
import { useGeneratedCode } from '../../code-settings/lib/useGeneratedCode'
import { fetchCodeSuggestion } from '../../code-settings/api/codeSettingsApi'

interface Loaded {
  /** Every point, for the ones that can be a prerequisite and for the whole record of the point being edited. */
  points: KnowledgePoint[]
  prerequisiteIds: string[]
}

const sameIds = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((id) => b.includes(id))

const LEVEL_OPTIONS = [
  { value: '55', label: '5.5' },
  { value: '60', label: '6.0' },
  { value: '65', label: '6.5' },
  { value: '70', label: '7.0' },
] as const

function pointSchema(autoApplied: boolean, hasSuggestionContext: boolean) {
  const code = autoApplied
    ? z.string().trim().max(100, 'Mã không được dài quá 100 ký tự.')
      .refine((value) => value ? CODE_PATTERN.test(value) : !hasSuggestionContext, CODE_PATTERN_MESSAGE)
    : requiredText('Mã', 100).regex(CODE_PATTERN, CODE_PATTERN_MESSAGE)
  const codeLevel = autoApplied
    ? z.string().refine((value) => ['55', '60', '65', '70'].includes(value), 'Cần chọn mức band.')
    : z.string().optional()
  return z.object({
    code,
    codeLevel,
    name: requiredText('Tên', 255),
    topicId: requiredChoice('chủ đề'),
    kind: requiredChoice('loại'),
    skill: autoApplied ? requiredChoice('kỹ năng') : z.string().optional(),
    learningType: requiredChoice('kiểu học'),
    canDo: z.string({ error: 'Can-do không được để trống.' }).trim().min(1, 'Can-do không được để trống.'),
  })
}

function Form({ point, loaded, topics, onSaved, onClose }: {
  point: KnowledgePoint | null
  loaded: Loaded
  topics: readonly TopicOption[]
  onSaved: () => void
  onClose: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<KnowledgePointForm>(point ? formOf(point) : EMPTY_FORM)
  const [codeLevel, setCodeLevel] = useState('')
  const [debouncedName, setDebouncedName] = useState(form.name)
  const [prerequisites, setPrerequisites] = useState(loaded.prerequisiteIds)
  const [, setError] = useAdminError()
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof KnowledgePointForm>(field: K) => (value: KnowledgePointForm[K]) => setForm((current) => ({ ...current, [field]: value }))
  const text = (field: keyof KnowledgePointForm) => ({ onChange: (event: { target: { value: string } }) => set(field)(event.target.value), value: form[field] })
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedName(form.name), 400)
    return () => window.clearTimeout(timer)
  }, [form.name])
  const generated = useGeneratedCode({
    kind: 'KNOWLEDGE_POINT',
    enabled: !point,
    initial: form.code,
    contextKey: `${form.kind}|${form.skill}|${codeLevel}|${debouncedName}`,
    ready: () => Boolean(form.kind && form.skill && codeLevel && debouncedName.trim()),
    suggest: (signal) => fetchCodeSuggestion({
      kind: 'KNOWLEDGE_POINT', kpKind: form.kind, skill: form.skill,
      level: codeLevel ? Number(codeLevel) : undefined, name: debouncedName,
    }, signal),
  })
  const autoApplied = !point && !!generated.policy?.applied
  const hasSuggestionContext = Boolean(form.kind && form.skill && codeLevel && debouncedName.trim())
  const codeValue = point ? form.code : generated.code
  const candidates = loaded.points.filter((item) => item.id !== point?.id)
  const errors = useFormErrors(pointSchema(autoApplied, hasSuggestionContext), { code: codeValue, codeLevel, name: form.name, topicId: form.topicId, kind: form.kind, skill: form.skill, learningType: form.learningType, canDo: form.canDo })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!errors.validate()) return
    setSaving(true)
    setError(null)
    let id = point?.id
    try {
      const request = requestOf({ ...form, code: codeValue })
      let saved: KnowledgePoint
      if (point) saved = await updateKnowledgePoint(point.id, request)
      else {
        const createRequest: CreateKnowledgePointRequest = { ...request }
        if (autoApplied) createRequest.codeLevel = Number(codeLevel)
        if (generated.locked) delete createRequest.code
        saved = await createKnowledgePoint(createRequest)
      }
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
      <div className="adm-filters adm-filters--fields">
        <AdminField label="Mã" {...errors.field('code')}>
          <input aria-required={generated.required || undefined} className="adm-input" disabled={generated.locked} placeholder="R55_SCANNING" value={codeValue} onChange={(event) => { set('code')(event.target.value); generated.onType(event.target.value) }} />
        </AdminField>
        {autoApplied ? <ChoiceChips error={errors.field('codeLevel').error} label="Mức band" onChange={setCodeLevel} options={LEVEL_OPTIONS} required value={codeLevel} /> : null}
        <AdminField className="kg-grow" label="Tên" {...errors.field('name')}>
          <input className="adm-input" {...text('name')} />
        </AdminField>
      </div>
      <AdminField label="Chủ đề" {...errors.field('topicId')}>
        <select className="adm-select" {...text('topicId')}>
          <option value="">Chọn chủ đề</option>
          {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name} ({topic.code})</option>)}
        </select>
      </AdminField>
      <ChoiceChips clearable error={errors.field('skill').error} label="Kỹ năng" onChange={set('skill')} options={SKILL_OPTIONS} required={autoApplied} value={form.skill} />
      <ChoiceChips error={errors.field('kind').error} label="Loại" onChange={set('kind')} options={KIND_OPTIONS} required value={form.kind} />
      <ChoiceChips error={errors.field('learningType').error} label="Kiểu học" onChange={set('learningType')} options={LEARNING_TYPE_OPTIONS} required value={form.learningType} />
      <ChoiceChips clearable label="Cấp CEFR" onChange={set('cefrLevel')} options={CEFR_OPTIONS} value={form.cefrLevel} />
      <AdminField label="Can-do" {...errors.field('canDo')}>
        <textarea className="adm-textarea kg-textarea" {...text('canDo')} />
      </AdminField>
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
