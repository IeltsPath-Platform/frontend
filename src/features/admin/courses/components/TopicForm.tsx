import { useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import type { TopicOption } from '../../lessons/types'
import { createTopic, updateTopic } from '../api/courseApi'
import { AdminField } from '../../components/AdminField'
import { SKILL_LABEL, TOPIC_SKILLS, type Course, type TopicCreate } from '../types'
import { topicError } from '../lib/topicHelpers'
import { useAdminError } from '../../lib/useAdminError'
import { optionalText, requiredText } from '@/lib/validation/fields'
import { ChoiceChips } from '../../knowledge-graph/components/ChoiceChips'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { fetchCodeSuggestion } from '../../code-settings/api/codeSettingsApi'
import { useGeneratedCode } from '../../code-settings/lib/useGeneratedCode'

const SKILL_CHOICES = TOPIC_SKILLS.map((item) => ({ value: item, label: SKILL_LABEL[item] }))

/**
 * What each field of the topic form needs. A topic that belongs to a course must have a skill. Errors are shown under the
 * field they are about. The band range of a topic is not asked for: it only labels the topic in the tree, and an edit sends
 * back the range the topic already has.
 */
function topicSchema(belongsToCourse: boolean, codeRequired: boolean) {
  return z.object({
    code: codeRequired ? requiredText('Mã chủ đề', 100) : optionalText('Mã chủ đề', 100),
    name: requiredText('Tên chủ đề', 255),
    description: optionalText('Mô tả chủ đề', 2000),
    skill: z.string(),
  }).superRefine((value, ctx) => {
    if (belongsToCourse && value.skill === '') ctx.addIssue({ code: 'custom', path: ['skill'], message: 'Chọn kỹ năng cho chủ đề thuộc khóa học.' })
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
  const [name, setName] = useState(topic?.name ?? '')
  const [description, setDescription] = useState(topic?.description ?? '')
  const [parent, setParent] = useState(topic?.parentTopicId ?? parentId ?? '')
  const [course, setCourse] = useState(topic?.courseId ?? courseId ?? '')
  const [skill, setSkill] = useState(topic?.skill ?? '')
  // The position is not asked for: a new topic goes last among its siblings in the course, and the tree moves it up or down.
  const sortOrder = topic?.sortOrder
    ?? Math.max(-1, ...topics.filter((item) => (item.parentTopicId ?? null) === parentId && (item.courseId ?? '') === course).map((item) => item.sortOrder)) + 1
  const [status, setStatus] = useState(topic?.status ?? 'ACTIVE')
  const [, setError] = useAdminError()
  const [saving, setSaving] = useState(false)
  const generated = useGeneratedCode({
    kind: 'TOPIC', enabled: !topic, initial: topic?.code ?? '', contextKey: `|${skill}`,
    ready: (pattern) => course !== '' && !(pattern.includes('{SKILL}') && !skill),
    suggest: (signal) => fetchCodeSuggestion({ kind: 'TOPIC', courseId: course, skill: skill || undefined }, signal),
  })
  const { code } = generated
  const schema = useMemo(() => topicSchema(course !== '', generated.required), [course, generated.required])
  const form = useFormErrors(schema, { code, name, description, skill })
  const excluded = new Set(topic ? [topic.id] : [])
  for (let changed = true; changed;) {
    changed = false
    for (const item of topics) if (item.parentTopicId && excluded.has(item.parentTopicId) && !excluded.has(item.id)) { excluded.add(item.id); changed = true }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!form.validate()) return
    const body: Omit<TopicCreate, 'code'> = { name: name.trim(), description: description.trim() || null, parentTopicId: parent || null, courseId: course || null, skill: skill as TopicCreate['skill'] || null, bandMin: topic?.bandMin ?? null, bandMax: topic?.bandMax ?? null, sortOrder }
    setSaving(true)
    setError(null)
    try {
      if (topic) await updateTopic(topic.id, { ...body, status: status as Course['status'] })
      else await createTopic({ ...body, ...(generated.codeToSend !== undefined ? { code: generated.codeToSend } : {}) })
      onSaved()
    } catch (reason) {
      setError(topicError(reason))
    } finally { setSaving(false) }
  }
  return <form aria-label={topic ? 'Sửa chủ đề' : 'Tạo chủ đề'} noValidate onSubmit={(event) => void submit(event)}>
    <fieldset className="adm-author-fields" disabled={saving}>
      <AdminField label="Mã chủ đề" {...form.field('code')} required={generated.required}><input className="adm-input" maxLength={100} disabled={!!topic || generated.locked} value={code} onChange={(event) => generated.onType(event.target.value)} /></AdminField>
      <AdminField label="Tên chủ đề" {...form.field('name')}><input className="adm-input" maxLength={255} value={name} onChange={(event) => setName(event.target.value)} /></AdminField>
      <AdminField label="Mô tả chủ đề" {...form.field('description')}><textarea className="adm-textarea" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></AdminField>
      {topic ? <label className="adm-field"><span>Thuộc khóa học</span><select className="adm-select" value={course} onChange={(event) => setCourse(event.target.value)}>{!topic.courseId ? <option value="">Chưa gán khóa</option> : null}{courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
      {topic?.parentTopicId ? <label className="adm-field"><span>Chủ đề cha</span><select className="adm-select" value={parent} onChange={(event) => setParent(event.target.value)}><option value="">Không có (cấp đầu)</option>{topics.filter((item) => !excluded.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label> : null}
      <ChoiceChips clearable={course === '' && !topic?.skill} error={form.field('skill').error} label="Kỹ năng" onChange={setSkill} options={SKILL_CHOICES} required={course !== ''} value={skill} />
      {topic ? <label className="adm-field"><span>Trạng thái chủ đề</span><select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ACTIVE">Đang dùng</option><option value="INACTIVE">Ngừng dùng</option></select></label> : null}
      <div className="adm-form-footer"><button className="adm-btn" type="button" onClick={onCancel}>Hủy</button><button className="adm-btn adm-btn--primary" type="submit">{saving ? 'Đang lưu…' : 'Lưu chủ đề'}</button></div>
    </fieldset>
  </form>
}
