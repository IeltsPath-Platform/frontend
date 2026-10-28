import { useId, useState, type FormEvent } from 'react'
import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'
import type { TopicOption } from '../../lessons/types'
import { createTopic, updateTopic } from '../api/courseApi'
import { SKILL_LABEL, TOPIC_SKILLS, validBand, type Course, type TopicCreate } from '../types'
import { topicError } from '../lib/topicHelpers'
import { useAdminError } from '../../lib/useAdminError'

/**
 * A new topic is always top level, and the parent field shows only for a topic that already has one, so it can be moved
 * back to the top. The learner's path lists every topic flat, so nesting is not offered for new topics.
 */
export function TopicForm({ topic, parentId, courseId, courses, topics, onSaved, onCancel }: {
  topic?: TopicOption; parentId: string | null; courseId: string | null; courses: Course[]; topics: TopicOption[]; onSaved: () => void; onCancel: () => void
}) {
  const [code, setCode] = useState(topic?.code ?? '')
  const [name, setName] = useState(topic?.name ?? '')
  const [parent, setParent] = useState(topic?.parentTopicId ?? parentId ?? '')
  const [course, setCourse] = useState(topic?.courseId ?? courseId ?? '')
  const [skill, setSkill] = useState(topic?.skill ?? '')
  const [min, setMin] = useState(topic?.bandMin?.toString() ?? '')
  const [max, setMax] = useState(topic?.bandMax?.toString() ?? '')
  const [order, setOrder] = useState(topic?.sortOrder.toString() ?? String(Math.max(-1, ...topics.filter((item) => (item.parentTopicId ?? null) === parentId).map((item) => item.sortOrder)) + 1))
  const [status, setStatus] = useState(topic?.status ?? 'ACTIVE')
  const [, setError] = useAdminError()
  const [orderError, setOrderError] = useState<string | null>(null)
  const orderId = useId()
  const [saving, setSaving] = useState(false)
  const excluded = new Set(topic ? [topic.id] : [])
  for (let changed = true; changed;) {
    changed = false
    for (const item of topics) if (item.parentTopicId && excluded.has(item.parentTopicId) && !excluded.has(item.id)) { excluded.add(item.id); changed = true }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError(null)
    setOrderError(null)
    if (!code.trim() || !name.trim()) { setError('Nhập mã và tên chủ đề.'); return }
    if ((min !== '' && !validBand(min)) || (max !== '' && !validBand(max))) { setError('Band phải từ 0 đến 9 theo bước 0,5.'); return }
    if (min !== '' && max !== '' && Number(min) > Number(max)) { setError('Band thấp nhất phải nhỏ hơn hoặc bằng band cao nhất.'); return }
    if (order.trim() === '' || !Number.isInteger(Number(order)) || Number(order) < 0) { setOrderError('Thứ tự phải là số nguyên không âm.'); return }
    const body: Omit<TopicCreate, 'code'> = { name: name.trim(), parentTopicId: parent || null, courseId: course || null, skill: skill as TopicCreate['skill'] || null, bandMin: min === '' ? null : Number(min), bandMax: max === '' ? null : Number(max), sortOrder: Number(order) }
    setSaving(true)
    setError(null)
    try {
      if (topic) await updateTopic(topic.id, { ...body, status: status as Course['status'] })
      else await createTopic({ ...body, code: code.trim() })
      onSaved()
    } catch (reason) {
      if (adminErrorCode(reason) === 'SORT_ORDER_TAKEN') setOrderError(adminErrorMessage(reason))
      else setError(topicError(reason))
    } finally { setSaving(false) }
  }
  return <form aria-label={topic ? 'Sửa chủ đề' : 'Tạo chủ đề'} noValidate onSubmit={(event) => void submit(event)}>
    <fieldset className="adm-author-fields" disabled={saving}>
      <label className="adm-field"><span>Mã chủ đề</span><input className="adm-input" required maxLength={100} disabled={!!topic} value={code} onChange={(event) => setCode(event.target.value)} /></label>
      <label className="adm-field"><span>Tên chủ đề</span><input className="adm-input" required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="adm-field"><span>Thuộc khóa học</span><select className="adm-select" value={course} onChange={(event) => setCourse(event.target.value)}>{!topic?.courseId ? <option value="">Chưa gán khóa</option> : null}{courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {topic?.parentTopicId ? <label className="adm-field"><span>Chủ đề cha</span><select className="adm-select" value={parent} onChange={(event) => { setParent(event.target.value); setOrderError(null) }}><option value="">Không có (cấp đầu)</option>{topics.filter((item) => !excluded.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label> : null}
      <label className="adm-field"><span>Kỹ năng</span><select className="adm-select" value={skill} onChange={(event) => setSkill(event.target.value)}>{!topic?.skill ? <option value="">Chưa chọn</option> : null}{TOPIC_SKILLS.map((item) => <option key={item} value={item}>{SKILL_LABEL[item]}</option>)}</select></label>
      <div className="adm-filters"><label className="adm-field"><span>Band thấp nhất</span><input className="adm-input" type="number" min={0} max={9} step={0.5} value={min} onChange={(event) => setMin(event.target.value)} /></label><label className="adm-field"><span>Band cao nhất</span><input className="adm-input" type="number" min={0} max={9} step={0.5} value={max} onChange={(event) => setMax(event.target.value)} /></label></div>
      <div>
        <label className="adm-field" htmlFor={orderId}><span>Thứ tự chủ đề</span><input id={orderId} className="adm-input" type="number" min={0} step={1} value={order} aria-invalid={!!orderError} aria-describedby={orderError ? `${orderId}-error` : undefined} onChange={(event) => { setOrder(event.target.value); setOrderError(null) }} /></label>
        {orderError ? <p id={`${orderId}-error`} className="adm-alert adm-alert--error" role="alert">{orderError}</p> : null}
      </div>
      {topic ? <label className="adm-field"><span>Trạng thái chủ đề</span><select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ACTIVE">Đang dùng</option><option value="INACTIVE">Ngừng dùng</option></select></label> : null}
      <div className="adm-form-footer"><button className="adm-btn" type="button" onClick={onCancel}>Hủy</button><button className="adm-btn adm-btn--primary" type="submit">{saving ? 'Đang lưu…' : 'Lưu chủ đề'}</button></div>
    </fieldset>
  </form>
}
