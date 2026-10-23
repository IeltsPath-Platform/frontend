import { ArrowDown, ArrowUp } from 'lucide-react'
import { SKILL_LABEL } from '../../courses/types'
import type { AdminResource } from '../../lib/useAdminResource'
import type { PackageListItem } from '../../packages/types'
import { COURSE_DRAFT_SKILLS, type CourseTopic } from '../types'
import { CourseFinalTestEditor } from './CourseFinalTestEditor'
import { CourseLessonEditor } from './CourseLessonEditor'

export function CourseTopicEditor({ value, onChange, disabled, practiceSets, usedPackageIds, number }: {
  value: CourseTopic; onChange: (next: CourseTopic) => void; disabled: boolean; practiceSets: AdminResource<PackageListItem[]>; usedPackageIds: readonly string[]; number: number
}) {
  function moveLesson(index: number, delta: number) {
    const lessons = [...value.lessons]
    ;[lessons[index], lessons[index + delta]] = [lessons[index + delta]!, lessons[index]!]
    onChange({ ...value, lessons })
  }
  return <div className="adm-course-draft-topic">
    <div className="adm-course-draft-grid">
      <label className="adm-field"><span>Mã chủ đề {number}</span><input className="adm-input" required maxLength={100} value={value.code} onChange={(event) => onChange({ ...value, code: event.target.value })} /></label>
      <label className="adm-field"><span>Tên chủ đề {number}</span><input className="adm-input" required maxLength={255} value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></label>
      <label className="adm-field"><span>Kỹ năng chủ đề {number}</span><select className="adm-select" value={value.skill} onChange={(event) => onChange({ ...value, skill: event.target.value as CourseTopic['skill'] })}>{COURSE_DRAFT_SKILLS.map((skill) => <option key={skill} value={skill}>{SKILL_LABEL[skill]}</option>)}</select></label>
      <label className="adm-field"><span>Thứ tự chủ đề {number}</span><input className="adm-input" type="number" min={0} max={2147483647} step={1} value={value.sortOrder} onChange={(event) => onChange({ ...value, sortOrder: Number(event.target.value) })} /></label>
    </div>
    <p className="adm-muted">Thứ tự số phải không trùng chủ đề đã có. Phân tích sẽ kiểm tra xung đột trước khi duyệt.</p>
    <h4>Bài học ({value.lessons.length}/50)</h4>
    {value.lessons.map((lesson, index) => <details className="adm-course-draft-subsection" key={index} open>
      <summary>Bài {index + 1}: {lesson.title || 'Chưa đặt tiêu đề'}</summary>
      <CourseLessonEditor value={lesson} number={index + 1} disabled={disabled} practiceSets={practiceSets} usedPackageIds={usedPackageIds} onChange={(next) => onChange({ ...value, lessons: value.lessons.map((item, position) => position === index ? next : item) })} />
      <div className="adm-course-draft-actions">
        <button className="adm-btn" type="button" disabled={disabled || index === 0} aria-label={`Đưa bài ${index + 1} lên`} onClick={() => moveLesson(index, -1)}><ArrowUp size={16} aria-hidden="true" /></button>
        <button className="adm-btn" type="button" disabled={disabled || index === value.lessons.length - 1} aria-label={`Đưa bài ${index + 1} xuống`} onClick={() => moveLesson(index, 1)}><ArrowDown size={16} aria-hidden="true" /></button>
        <button className="adm-btn adm-btn--danger" type="button" disabled={disabled} onClick={() => { if (window.confirm(`Gỡ bài ${index + 1} khỏi chủ đề trong bản nháp?`)) onChange({ ...value, lessons: value.lessons.filter((_, position) => position !== index) }) }}>Gỡ bài {index + 1}</button>
      </div>
    </details>)}
    <button className="adm-btn" type="button" disabled={disabled || value.lessons.length >= 50} onClick={() => onChange({ ...value, lessons: [...value.lessons, { code: '', title: '', summary: '', knowledgePointIds: [], blocks: [], practiceSetPackageIds: [] }] })}>Thêm bài học</button>
    <CourseFinalTestEditor label="Đề cuối chủ đề" value={value.topicTest} disabled={disabled} onChange={(topicTest) => onChange({ ...value, topicTest })} />
  </div>
}
