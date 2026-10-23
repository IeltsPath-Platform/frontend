import { ArrowDown, ArrowUp } from 'lucide-react'
import type { AdminResource } from '../../lib/useAdminResource'
import type { PackageListItem } from '../../packages/types'
import { KnowledgePointPicker } from '../../questions/components/KnowledgePointPicker'
import type { CourseLesson } from '../types'
import { CourseBlockEditor } from './CourseBlockEditor'
import { CoursePackagePicker } from './CoursePackagePicker'

export function CourseLessonEditor({ value, onChange, disabled, practiceSets, usedPackageIds, number }: {
  value: CourseLesson; onChange: (next: CourseLesson) => void; disabled: boolean; practiceSets: AdminResource<PackageListItem[]>; usedPackageIds: readonly string[]; number: number
}) {
  function moveBlock(index: number, delta: number) {
    const blocks = [...value.blocks]
    ;[blocks[index], blocks[index + delta]] = [blocks[index + delta]!, blocks[index]!]
    onChange({ ...value, blocks })
  }
  return <div className="adm-course-draft-lesson">
    <label className="adm-field"><span>Mã bài học {number}</span><input className="adm-input" required maxLength={100} value={value.code} onChange={(event) => onChange({ ...value, code: event.target.value })} /></label>
    <label className="adm-field"><span>Tiêu đề bài học {number}</span><input className="adm-input" required maxLength={255} value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} /></label>
    <label className="adm-field"><span>Tóm tắt bài học {number}</span><textarea className="adm-textarea" maxLength={2000} value={value.summary ?? ''} onChange={(event) => onChange({ ...value, summary: event.target.value })} /></label>
    <details><summary>Điểm kiến thức bài học {number} ({value.knowledgePointIds.length}/50)</summary><KnowledgePointPicker value={value.knowledgePointIds.map((knowledgePointId) => ({ knowledgePointId, weight: 1 }))} onChange={(next) => { if (next.length <= 50) onChange({ ...value, knowledgePointIds: next.map((item) => item.knowledgePointId) }) }} /></details>
    <h5>Nội dung bài học ({value.blocks.length}/50)</h5>
    {value.blocks.map((block, index) => <section className="adm-course-draft-subsection" key={index} aria-label={`Khối ${index + 1} của bài ${number}`}>
      <CourseBlockEditor value={block} number={index + 1} disabled={disabled} onChange={(next) => onChange({ ...value, blocks: value.blocks.map((item, position) => position === index ? next : item) })} />
      <div className="adm-course-draft-actions">
        <button className="adm-btn" type="button" disabled={disabled || index === 0} aria-label={`Đưa khối ${index + 1} lên`} onClick={() => moveBlock(index, -1)}><ArrowUp size={16} aria-hidden="true" /></button>
        <button className="adm-btn" type="button" disabled={disabled || index === value.blocks.length - 1} aria-label={`Đưa khối ${index + 1} xuống`} onClick={() => moveBlock(index, 1)}><ArrowDown size={16} aria-hidden="true" /></button>
        <button className="adm-btn adm-btn--danger" type="button" disabled={disabled} onClick={() => { if (window.confirm(`Gỡ khối ${index + 1} khỏi bài học trong bản nháp?`)) onChange({ ...value, blocks: value.blocks.filter((_, position) => position !== index) }) }}>Gỡ khối {index + 1}</button>
      </div>
    </section>)}
    <div className="adm-course-draft-actions">
      <button className="adm-btn" type="button" disabled={disabled || value.blocks.length >= 50} onClick={() => onChange({ ...value, blocks: [...value.blocks, { type: 'TEXT', text: '', knowledgePointIds: [], questionRefs: [] }] })}>Thêm khối văn bản</button>
      <button className="adm-btn" type="button" disabled={disabled || value.blocks.length >= 50} onClick={() => onChange({ ...value, blocks: [...value.blocks, { type: 'EXERCISE', text: null, knowledgePointIds: [], questionRefs: [] }] })}>Thêm khối bài tập</button>
    </div>
    <CoursePackagePicker value={value.practiceSetPackageIds} onChange={(practiceSetPackageIds) => onChange({ ...value, practiceSetPackageIds })} catalog={practiceSets} usedIds={usedPackageIds} disabled={disabled} />
  </div>
}
