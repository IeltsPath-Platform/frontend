import { useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import type { TopicOption } from '../../lessons/types'
import { createTopic, updateTopic } from '../api/courseApi'
import { AdminField } from '../../components/AdminField'
import { SKILL_LABEL, TOPIC_SKILLS, type Course, type TopicCreate } from '../types'
import { topicError } from '../lib/topicHelpers'
import { useAdminError } from '../../lib/useAdminError'
import { bandText, nonNegativeIntegerText, optionalText, requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'

/**
 * What each field of the topic form needs. A topic that belongs to a course must have a skill; the lowest band may not
 * be above the highest. Errors are shown under the field they are about.
 */
function topicSchema(belongsToCourse: boolean) {
  return z.object({
    code: requiredText('Mã chủ đề', 100),
    name: requiredText('Tên chủ đề', 255),
    description: optionalText('Mô tả chủ đề', 2000),
    skill: z.string(),
    min: bandText('Band thấp nhất', { optional: true }),
    max: bandText('Band cao nhất', { optional: true }),
    order: nonNegativeIntegerText('Thứ tự chủ đề'),
  }).superRefine((value, ctx) => {
    if (belongsToCourse && value.skill === '') ctx.addIssue({ code: 'custom', path: ['skill'], message: 'Chọn kỹ năng cho chủ đề thuộc khóa học.' })
    const low = Number(value.min)
    const high = Number(value.max)
    if (value.min.trim() !== '' && value.max.trim() !== '' && Number.isFinite(low) && Number.isFinite(high) && low > high) {
      ctx.addIssue({ code: 'custom', path: ['min'], message: 'Band thấp nhất phải nhỏ hơn hoặc bằng band cao nhất.' })
    }
  })
}

/**
 * A new topic is always top level, and the parent field shows only for a topic that already has one, so it can be moved
 * back to the top. The learner's path lists every topic flat, so nesting is not offered for new topics.
 * A new topic belongs to the course the page is showing (`courseId`, none on the unassigned tab); only an existing
 * topic offers a choice of course, to move it.
 */
export function TopicForm({ topic, parentId, courseId, courses, topics, onSaved, onCancel }: {
  topic?: TopicOption; parentId: string | null; courseId: string | null; courses: Course[]; topics: TopicOption[]; onSaved: () => void; onCancel: () => void
}) {
  const [code, setCode] = useState(topic?.code ?? '')
  const [name, setName] = useState(topic?.name ?? '')
  const [description, setDescription] = useState(topic?.description ?? '')
  const [parent, setParent] = useState(topic?.parentTopicId ?? parentId ?? '')
  const [course, setCourse] = useState(topic?.courseId ?? courseId ?? '')
  const [skill, setSkill] = useState(topic?.skill ?? '')
  const [min, setMin] = useState(topic?.bandMin?.toString() ?? '')
  const [max, setMax] = useState(topic?.bandMax?.toString() ?? '')
  const [order, setOrder] = useState(topic?.sortOrder.toString() ?? String(Math.max(-1, ...topics.filter((item) => (item.parentTopicId ?? null) === parentId).map((item) => item.sortOrder)) + 1))
  const [status, setStatus] = useState(topic?.status ?? 'ACTIVE')
  const [, setError] = useAdminError()
  const [saving, setSaving] = useState(false)
  const schema = useMemo(() => topicSchema(course !== ''), [course])
  const form = useFormErrors(schema, { code, name, description, skill, min, max, order })
  const excluded = new Set(topic ? [topic.id] : [])
  for (let changed = true; changed;) {
    changed = false
    for (const item of topics) if (item.parentTopicId && excluded.has(item.parentTopicId) && !excluded.has(item.id)) { excluded.add(item.id); changed = true }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!form.validate()) return
    const body: Omit<TopicCreate, 'code'> = { name: name.trim(), description: description.trim() || null, parentTopicId: parent || null, courseId: course || null, skill: skill as TopicCreate['skill'] || null, bandMin: min === '' ? null : Number(min), bandMax: max === '' ? null : Number(max), sortOrder: Number(order) }
    setSaving(true)
    setError(null)
    try {
      if (topic) await updateTopic(topic.id, { ...body, status: status as Course['status'] })
      else await createTopic({ ...body, code: code.trim() })
      onSaved()
    } catch (reason) {
      setError(topicError(reason))
    } finally { setSaving(false) }
  }
  return <form aria-label={topic ? 'Sửa chủ đề' : 'Tạo chủ đề'} noValidate onSubmit={(event) => void submit(event)}>
    <fieldset className="adm-author-fields" disabled={saving}>
      <AdminField label="Mã chủ đề" {...form.field('code')} required={!topic}><input className="adm-input" maxLength={100} disabled={!!topic} value={code} onChange={(event) => setCode(event.target.value)} /></AdminField>
      <AdminField label="Tên chủ đề" {...form.field('name')}><input className="adm-input" maxLength={255} value={name} onChange={(event) => setName(event.target.value)} /></AdminField>
      <AdminField label="Mô tả chủ đề" {...form.field('description')}><textarea className="adm-textarea" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></AdminField>
      {topic ? <label className="adm-field"><span>Thuộc khóa học</span><select className="adm-select" value={course} onChange={(event) => setCourse(event.target.value)}>{!topic.courseId ? <option value="">Chưa gán khóa</option> : null}{courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
      {topic?.parentTopicId ? <label className="adm-field"><span>Chủ đề cha</span><select className="adm-select" value={parent} onChange={(event) => setParent(event.target.value)}><option value="">Không có (cấp đầu)</option>{topics.filter((item) => !excluded.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label> : null}
      <AdminField label="Kỹ năng" {...form.field('skill')} required={course !== ''}><select className="adm-select" value={skill} onChange={(event) => setSkill(event.target.value)}>{!topic?.skill ? <option value="">Chưa chọn</option> : null}{TOPIC_SKILLS.map((item) => <option key={item} value={item}>{SKILL_LABEL[item]}</option>)}</select></AdminField>
      <div className="adm-filters">
        <AdminField label="Band thấp nhất" {...form.field('min')}><input className="adm-input" type="number" min={0} max={9} step={0.5} value={min} onChange={(event) => setMin(event.target.value)} /></AdminField>
        <AdminField label="Band cao nhất" {...form.field('max')}><input className="adm-input" type="number" min={0} max={9} step={0.5} value={max} onChange={(event) => setMax(event.target.value)} /></AdminField>
      </div>
      <AdminField label="Thứ tự chủ đề" {...form.field('order')}><input className="adm-input" type="number" min={0} step={1} value={order} onChange={(event) => setOrder(event.target.value)} /></AdminField>
      {topic ? <label className="adm-field"><span>Trạng thái chủ đề</span><select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ACTIVE">Đang dùng</option><option value="INACTIVE">Ngừng dùng</option></select></label> : null}
      <div className="adm-form-footer"><button className="adm-btn" type="button" onClick={onCancel}>Hủy</button><button className="adm-btn adm-btn--primary" type="submit">{saving ? 'Đang lưu…' : 'Lưu chủ đề'}</button></div>
    </fieldset>
  </form>
}
