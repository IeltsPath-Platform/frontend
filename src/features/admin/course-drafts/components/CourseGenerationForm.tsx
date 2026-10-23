import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SKILL_LABEL } from '../../courses/types'
import { KnowledgePointPicker } from '../../questions/components/KnowledgePointPicker'
import { requestCourseDraft } from '../api/courseDraftApi'
import { courseDraftError } from '../lib/courseDraftLabels'
import { COURSE_CANDIDATE_LIMIT, COURSE_DRAFT_SKILLS, courseGenerationRequestSchema, type CourseDraft, type CourseGenerationRequest } from '../types'

export function CourseGenerationForm({ onCreated, onCancel }: {
  onCreated: (draft: CourseDraft) => void; onCancel: () => void
}) {
  const [bandLevel, setBandLevel] = useState(6.5)
  const [skills, setSkills] = useState<CourseGenerationRequest['skills']>(['READING'])
  const [knowledgePointIds, setKnowledgePointIds] = useState<string[]>([])
  const [topics, setTopics] = useState('')
  const [lessonCount, setLessonCount] = useState('8')
  const [instructions, setInstructions] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const parsed = courseGenerationRequestSchema.safeParse({ bandLevel, skills, knowledgePointIds, topics: topics.split(/\r?\n/).map((topic) => topic.trim()).filter(Boolean), lessonCount: Number(lessonCount), instructions })
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0]
      setError(field === 'skills' ? 'Chọn ít nhất một kỹ năng.'
        : field === 'lessonCount' ? 'Số bài học phải là số nguyên từ 1 đến 30.'
        : field === 'topics' ? 'Nhập tối đa 10 chủ đề, mỗi dòng một chủ đề không quá 100 ký tự.'
        : field === 'instructions' ? 'Hướng dẫn thêm không quá 500 ký tự.'
        : field === 'knowledgePointIds' ? `Chọn tối đa ${COURSE_CANDIDATE_LIMIT} điểm kiến thức hợp lệ.`
        : 'Chọn điểm kiến thức hoặc nhập ít nhất một chủ đề để dựng khóa học.')
      return
    }
    setPending(true); setError(null)
    try {
      const draft = await requestCourseDraft(parsed.data)
      if (mounted.current) onCreated(draft)
    } catch (reason) { if (mounted.current) setError(courseDraftError(reason)) }
    finally { if (mounted.current) setPending(false) }
  }

  return <form className="adm-card adm-course-draft-generation" aria-label="Sinh bản nháp khóa học" noValidate onSubmit={(event) => void submit(event)}>
    <h2>Sinh khóa học bằng AI</h2>
    <p className="adm-muted">Chọn kiến thức trong kho hoặc nêu chủ đề. Hệ thống chỉ sắp xếp nội dung có sẵn; bạn kiểm tra và chỉnh bản nháp trước khi duyệt.</p>
    {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
    <fieldset className="adm-course-draft-fields" disabled={pending}>
      <legend className="adm-sr-only">Yêu cầu dựng khóa học</legend>
      <label className="adm-field"><span>Band mục tiêu</span><select className="adm-select" value={bandLevel} onChange={(event) => setBandLevel(Number(event.target.value))}>{Array.from({ length: 19 }, (_, index) => index * 0.5).map((band) => <option key={band} value={band}>{band.toFixed(1)}</option>)}</select></label>
      <fieldset className="adm-course-draft-skills"><legend>Kỹ năng</legend>{COURSE_DRAFT_SKILLS.map((skill) => <label className="adm-check" key={skill}><input type="checkbox" checked={skills.includes(skill)} onChange={(event) => setSkills(event.target.checked ? [...skills, skill] : skills.filter((item) => item !== skill))} /><span>{SKILL_LABEL[skill]}</span></label>)}</fieldset>
      <section aria-label="Điểm kiến thức cho khóa học"><h3>Chọn điểm kiến thức ({knowledgePointIds.length}/{COURSE_CANDIDATE_LIMIT})</h3><KnowledgePointPicker value={knowledgePointIds.map((knowledgePointId) => ({ knowledgePointId, weight: 1 }))} onChange={(next) => {
        if (next.length > COURSE_CANDIDATE_LIMIT) { setError(`Chọn tối đa ${COURSE_CANDIDATE_LIMIT} điểm kiến thức.`); return }
        setKnowledgePointIds(next.map((item) => item.knowledgePointId))
      }} /></section>
      <label className="adm-field"><span>Chủ đề (mỗi dòng một chủ đề, tùy chọn)</span><textarea className="adm-textarea" value={topics} onChange={(event) => setTopics(event.target.value)} /><small className="adm-muted">Tối đa 10 dòng, mỗi chủ đề tối đa 100 ký tự. Cần có điểm kiến thức hoặc chủ đề.</small></label>
      <label className="adm-field"><span>Số bài học</span><input className="adm-input" type="number" min={1} max={30} step={1} required value={lessonCount} onChange={(event) => setLessonCount(event.target.value)} /></label>
      <label className="adm-field"><span>Hướng dẫn thêm (tùy chọn)</span><textarea className="adm-textarea" maxLength={500} value={instructions} onChange={(event) => setInstructions(event.target.value)} /><small className="adm-muted">{instructions.length}/500 ký tự</small></label>
      <div className="adm-course-draft-actions"><button className="adm-btn adm-btn--primary" type="submit">{pending ? 'Đang gửi yêu cầu…' : 'Sinh bản nháp khóa học'}</button><button className="adm-btn" type="button" onClick={onCancel}>Hủy</button></div>
    </fieldset>
  </form>
}
