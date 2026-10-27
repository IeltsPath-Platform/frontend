import { useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { AdminDrawer } from '../../components/AdminLayer'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { SKILL_LABEL } from '../../courses/types'
import type { AdminResource } from '../../lib/useAdminResource'
import type { PackageListItem } from '../../packages/types'
import { COURSE_DRAFT_SKILLS, type CourseTopic } from '../types'
import { CourseFinalTestEditor } from './CourseFinalTestEditor'
import { CourseLessonEditor } from './CourseLessonEditor'

/**
 * One topic: its own fields, then its lessons as a compact table. A lesson is edited in a drawer on the right, so the
 * page never nests a lesson editor inside a topic inside the course.
 */
export function CourseTopicEditor({ value, onChange, disabled, practiceSets, usedPackageIds, number }: {
  value: CourseTopic; onChange: (next: CourseTopic) => void; disabled: boolean; practiceSets: AdminResource<PackageListItem[]>; usedPackageIds: readonly string[]; number: number
}) {
  const { confirm, confirmDialog } = useAdminConfirm()
  const [editing, setEditing] = useState<number | null>(null)
  const lesson = editing === null ? null : value.lessons[editing] ?? null
  function moveLesson(index: number, delta: number) {
    const lessons = [...value.lessons]
    ;[lessons[index], lessons[index + delta]] = [lessons[index + delta]!, lessons[index]!]
    onChange({ ...value, lessons })
  }
  function addLesson() {
    onChange({ ...value, lessons: [...value.lessons, { code: '', title: '', summary: '', knowledgePointIds: [], blocks: [], practiceSetPackageIds: [] }] })
    setEditing(value.lessons.length)
  }
  return <div className="adm-course-draft-topic">
    {confirmDialog}
    <div className="adm-course-draft-grid">
      <label className="adm-field"><span>Mã chủ đề {number}</span><input className="adm-input" required maxLength={100} value={value.code} onChange={(event) => onChange({ ...value, code: event.target.value })} /></label>
      <label className="adm-field"><span>Tên chủ đề {number}</span><input className="adm-input" required maxLength={255} value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></label>
      <label className="adm-field"><span>Kỹ năng chủ đề {number}</span><select className="adm-select" value={value.skill} onChange={(event) => onChange({ ...value, skill: event.target.value as CourseTopic['skill'] })}>{COURSE_DRAFT_SKILLS.map((skill) => <option key={skill} value={skill}>{SKILL_LABEL[skill]}</option>)}</select></label>
      <label className="adm-field"><span>Thứ tự chủ đề {number}</span><input className="adm-input" type="number" min={0} max={2147483647} step={1} value={value.sortOrder} onChange={(event) => onChange({ ...value, sortOrder: Number(event.target.value) })} /></label>
    </div>
    <div className="adm-sec">
      <div className="adm-sec__head">
        <h4 className="adm-sec__title">Bài học<span className="adm-count">{value.lessons.length}/50</span></h4>
        <button className="adm-btn adm-btn--small" type="button" disabled={disabled || value.lessons.length >= 50} onClick={addLesson}><Plus aria-hidden="true" size={14} />Thêm bài học</button>
      </div>
      <div className="adm-table-wrap adm-kp-table">
        <table aria-label={`Bài học của chủ đề ${number}`} className="adm-table">
          <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Mã</th><th scope="col">Tiêu đề</th><th scope="col">Điểm kiến thức</th><th scope="col">Khối</th><th className="adm-col-actions" scope="col">Hành động</th></tr></thead>
          <tbody>{value.lessons.length === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={6}>Chủ đề chưa có bài học nào.</td></tr> : value.lessons.map((item, index) => <tr key={index}>
            <td className="adm-stt">{index + 1}</td>
            <td><code>{item.code || '—'}</code></td>
            <td><button className="adm-lesson-open" onClick={() => setEditing(index)} type="button">{item.title || 'Chưa đặt tiêu đề'}</button></td>
            <td className="adm-muted">{item.knowledgePointIds.length}</td>
            <td className="adm-muted">{item.blocks.length}</td>
            <td className="adm-col-actions">
              <AdminRowMenu label={`Hành động của bài ${index + 1}`} items={[
                { key: 'edit', label: 'Sửa bài học', ariaLabel: `Sửa bài ${index + 1}`, icon: <Pencil aria-hidden="true" size={16} />, onSelect: () => setEditing(index) },
                { key: 'up', label: 'Đưa lên', ariaLabel: `Đưa bài ${index + 1} lên`, icon: <ArrowUp aria-hidden="true" size={16} />, disabled: disabled || index === 0, onSelect: () => moveLesson(index, -1) },
                { key: 'down', label: 'Đưa xuống', ariaLabel: `Đưa bài ${index + 1} xuống`, icon: <ArrowDown aria-hidden="true" size={16} />, disabled: disabled || index === value.lessons.length - 1, onSelect: () => moveLesson(index, 1) },
                { key: 'remove', label: 'Gỡ khỏi chủ đề', ariaLabel: `Gỡ bài ${index + 1}`, icon: <Trash2 aria-hidden="true" size={16} />, tone: 'danger', disabled, onSelect: () => void (async () => {
                  if (await confirm({ title: 'Gỡ bài học khỏi chủ đề?', message: `Gỡ bài ${index + 1} khỏi chủ đề trong bản nháp?`, confirmLabel: 'Gỡ bài học', tone: 'danger' })) onChange({ ...value, lessons: value.lessons.filter((_, position) => position !== index) })
                })() },
              ]} />
            </td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
    {editing !== null && lesson ? <AdminDrawer description={lesson.code || undefined} onClose={() => setEditing(null)} size="xl" title={`Bài ${editing + 1}: ${lesson.title || 'Chưa đặt tiêu đề'}`}>
      {(close) => <>
        <fieldset className="adm-course-draft-fields" disabled={disabled}>
          <CourseLessonEditor value={lesson} number={editing + 1} skill={value.skill} disabled={disabled} practiceSets={practiceSets} usedPackageIds={usedPackageIds} onChange={(next) => onChange({ ...value, lessons: value.lessons.map((item, position) => position === editing ? next : item) })} />
        </fieldset>
        <div className="adm-form-footer"><button className="adm-btn" onClick={close} type="button">Đóng</button><button className="adm-btn adm-btn--primary" onClick={close} type="button">Lưu</button></div>
      </>}
    </AdminDrawer> : null}
    <CourseFinalTestEditor label="Đề cuối chủ đề" value={value.topicTest} disabled={disabled} onChange={(topicTest) => onChange({ ...value, topicTest })} />
  </div>
}
