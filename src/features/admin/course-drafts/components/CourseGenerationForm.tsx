import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { SKILL_LABEL } from '../../courses/types'
import { requestCourseDraft } from '../api/courseDraftApi'
import { courseDraftError } from '../lib/courseDraftLabels'
import { BandPicker } from './BandPicker'
import { CourseKnowledgePicker } from './CourseKnowledgePicker'
import { COURSE_CANDIDATE_LIMIT, COURSE_DRAFT_SKILLS, courseGenerationRequestSchema, type CourseDraft, type CourseGenerationRequest } from '../types'
import { useAdminError } from '../../lib/useAdminError'

export function CourseGenerationForm({ onCreated, onCancel }: {
  onCreated: (draft: CourseDraft) => void; onCancel: () => void
}) {
  const skillsLabel = useId()
  const [bandLevel, setBandLevel] = useState(6.5)
  const [skills, setSkills] = useState<CourseGenerationRequest['skills']>(['READING'])
  const [knowledgePointIds, setKnowledgePointIds] = useState<string[]>([])
  const [lessonCount, setLessonCount] = useState('8')
  const [instructions, setInstructions] = useState('')
  const [pending, setPending] = useState(false)
  const [, setError] = useAdminError()
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  /** The points on offer depend on the band and the skills, so changing either starts the pick again. */
  function changeBand(band: number) {
    if (band === bandLevel) return
    setBandLevel(band); setKnowledgePointIds([])
  }
  function changeSkills(next: CourseGenerationRequest['skills']) {
    setSkills(next); setKnowledgePointIds([])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const parsed = courseGenerationRequestSchema.safeParse({ bandLevel, skills, knowledgePointIds, topics: [], lessonCount: Number(lessonCount), instructions, includePrerequisites: false })
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0]
      setError(field === 'skills' ? 'Chọn ít nhất một kỹ năng.'
        : field === 'lessonCount' ? 'Số bài học phải là số nguyên từ 1 đến 30.'
            : field === 'instructions' ? 'Hướng dẫn thêm không quá 500 ký tự.'
              : field === 'knowledgePointIds' ? `Chọn tối đa ${COURSE_CANDIDATE_LIMIT} điểm kiến thức hợp lệ.`
                : 'Chọn ít nhất một điểm kiến thức để dựng khóa học.')
      return
    }
    setPending(true); setError(null)
    try {
      const draft = await requestCourseDraft(parsed.data)
      if (mounted.current) onCreated(draft)
    } catch (reason) { if (mounted.current) setError(courseDraftError(reason)) }
    finally { if (mounted.current) setPending(false) }
  }

  return <form className="adm-course-draft-generation" aria-label="Sinh bản nháp khóa học" noValidate onSubmit={(event) => void submit(event)}>
    <fieldset className="adm-course-draft-fields" disabled={pending}>
      <legend className="adm-sr-only">Yêu cầu dựng khóa học</legend>
      <BandPicker onChange={changeBand} value={bandLevel} />
      <div aria-labelledby={skillsLabel} className="adm-course-draft-skills" role="group"><span className="adm-course-draft-skills__label" id={skillsLabel}>Kỹ năng<span aria-hidden="true" className="adm-required" /></span>{COURSE_DRAFT_SKILLS.map((skill) => <label className="adm-check" key={skill}><input type="checkbox" checked={skills.includes(skill)} onChange={(event) => changeSkills(event.target.checked ? [...skills, skill] : skills.filter((item) => item !== skill))} /><span>{SKILL_LABEL[skill]}</span></label>)}</div>
      <section aria-label="Điểm kiến thức cho khóa học">
        <CourseKnowledgePicker bandLevel={bandLevel} limit={COURSE_CANDIDATE_LIMIT} onChange={setKnowledgePointIds} skills={skills} value={knowledgePointIds} />
      </section>
      <label className="adm-field"><span>Số bài học<span aria-hidden="true" className="adm-required" /></span><input aria-required="true" className="adm-input" type="number" min={1} max={30} step={1} required value={lessonCount} onChange={(event) => setLessonCount(event.target.value)} /></label>
      <label className="adm-field"><span>Hướng dẫn thêm</span><textarea className="adm-textarea" maxLength={500} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
      <div className="adm-form-footer"><button className="adm-btn" type="button" onClick={onCancel}>Hủy</button><button className="adm-btn adm-btn--primary" type="submit">{pending ? 'Đang gửi yêu cầu…' : 'Sinh bản nháp khóa học'}</button></div>
    </fieldset>
  </form>
}
