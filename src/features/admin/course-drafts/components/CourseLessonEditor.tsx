import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, FileText, ListChecks, Plus, Trash2 } from 'lucide-react'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import type { AdminResource } from '../../lib/useAdminResource'
import type { PackageListItem } from '../../packages/types'
import type { CourseLesson } from '../types'
import { CourseBlockEditor } from './CourseBlockEditor'
import { CourseKnowledgeField } from './CourseKnowledgeField'
import { CourseLessonResources } from './CourseLessonResources'
import { CoursePackagePicker } from './CoursePackagePicker'

/**
 * One lesson: its names, the knowledge points it teaches, then its blocks as cards (each with its own move and remove
 * buttons in the card header) and the practice sets that follow.
 */
export function CourseLessonEditor({ value, onChange, disabled, practiceSets, usedPackageIds, number, skill }: {
  value: CourseLesson; onChange: (next: CourseLesson) => void; disabled: boolean; practiceSets: AdminResource<PackageListItem[]>; usedPackageIds: readonly string[]; number: number; skill: string
}) {
  const { confirm, confirmDialog } = useAdminConfirm()
  // Blocks that are folded to their header; all start open.
  const [folded, setFolded] = useState<number[]>([])
  const fold = (index: number) => setFolded((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]))
  function moveBlock(index: number, delta: number) {
    const blocks = [...value.blocks]
    ;[blocks[index], blocks[index + delta]] = [blocks[index + delta]!, blocks[index]!]
    onChange({ ...value, blocks })
    setFolded((current) => current.map((item) => (item === index ? index + delta : item === index + delta ? index : item)))
  }
  function removeBlock(index: number) {
    onChange({ ...value, blocks: value.blocks.filter((_, position) => position !== index) })
    setFolded((current) => current.filter((item) => item !== index).map((item) => (item > index ? item - 1 : item)))
  }
  return <div className="adm-course-draft-lesson">
    {confirmDialog}
    <div className="adm-course-draft-grid">
      <label className="adm-field"><span>Mã bài học {number}</span><input className="adm-input" required maxLength={100} value={value.code} onChange={(event) => onChange({ ...value, code: event.target.value })} /></label>
      <label className="adm-field"><span>Tiêu đề bài học {number}</span><input className="adm-input" required maxLength={255} value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} /></label>
    </div>
    <label className="adm-field"><span>Tóm tắt bài học {number}</span><textarea className="adm-textarea" maxLength={2000} value={value.summary ?? ''} onChange={(event) => onChange({ ...value, summary: event.target.value })} /></label>
    <div className="adm-course-draft-grid">
      <label className="adm-field"><span>Thời lượng dự kiến (phút)</span><input className="adm-input" inputMode="numeric" max={600} min={1} onChange={(event) => onChange({ ...value, estimatedMinutes: event.target.value === '' ? null : Number(event.target.value) })} step={1} type="number" value={value.estimatedMinutes ?? ''} /></label>
    </div>
    <label className="adm-field"><span>Tóm tắt trang bài học (Markdown)</span><textarea className="adm-textarea adm-textarea--tall" maxLength={20000} onChange={(event) => onChange({ ...value, summaryMarkdown: event.target.value === '' ? null : event.target.value })} value={value.summaryMarkdown ?? ''} /></label>
    <CourseLessonResources disabled={disabled} onChange={(resources) => onChange({ ...value, resources })} value={value.resources ?? []} />
    <CourseKnowledgeField disabled={disabled} onChange={(next) => { if (next.length <= 50) onChange({ ...value, knowledgePointIds: next }) }} skill={skill} title={`Điểm kiến thức bài học ${number}`} value={value.knowledgePointIds} />
    <div className="adm-sec">
      <div className="adm-sec__head">
        <h5 className="adm-sec__title">Nội dung bài học<span className="adm-count">{value.blocks.length}/50</span></h5>
        <div className="adm-sec__tools">
          {value.blocks.length > 1 ? <>
            <button className="adm-btn adm-btn--small" type="button" onClick={() => setFolded(value.blocks.map((_, index) => index))}>Thu gọn tất cả</button>
            <button className="adm-btn adm-btn--small" type="button" onClick={() => setFolded([])}>Mở tất cả</button>
          </> : null}
          <button className="adm-btn adm-btn--small" type="button" disabled={disabled || value.blocks.length >= 50} onClick={() => onChange({ ...value, blocks: [...value.blocks, { type: 'TEXT', text: '', knowledgePointIds: [], questionRefs: [] }] })}><Plus aria-hidden="true" size={14} />Thêm khối văn bản</button>
          <button className="adm-btn adm-btn--small" type="button" disabled={disabled || value.blocks.length >= 50} onClick={() => onChange({ ...value, blocks: [...value.blocks, { type: 'EXERCISE', text: null, knowledgePointIds: [], questionRefs: [] }] })}><Plus aria-hidden="true" size={14} />Thêm khối bài tập</button>
        </div>
      </div>
      {value.blocks.length === 0 ? <p className="adm-muted">Bài chưa có khối nội dung nào.</p> : null}
      {value.blocks.map((block, index) => <section className="adm-bcard" key={index} aria-label={`Khối ${index + 1} của bài ${number}`}>
        <header className="adm-bcard__head">
          <span aria-hidden="true" className="adm-bcard__icon">{block.type === 'TEXT' ? <FileText size={16} /> : <ListChecks size={16} />}</span>
          <h6><button aria-expanded={!folded.includes(index)} className="adm-bcard__toggle" onClick={() => fold(index)} type="button"><ChevronDown aria-hidden="true" size={16} />Khối {index + 1} · {block.type === 'TEXT' ? 'Văn bản' : 'Bài tập'}</button></h6>
          <div className="adm-tcard__actions">
            <button className="adm-icon-btn" type="button" disabled={disabled || index === 0} aria-label={`Đưa khối ${index + 1} lên`} onClick={() => moveBlock(index, -1)}><ArrowUp size={16} aria-hidden="true" /></button>
            <button className="adm-icon-btn" type="button" disabled={disabled || index === value.blocks.length - 1} aria-label={`Đưa khối ${index + 1} xuống`} onClick={() => moveBlock(index, 1)}><ArrowDown size={16} aria-hidden="true" /></button>
            <button className="adm-icon-btn adm-icon-btn--danger" type="button" disabled={disabled} aria-label={`Gỡ khối ${index + 1}`} onClick={() => void (async () => {
              if (await confirm({ title: 'Gỡ khối khỏi bài học?', message: `Gỡ khối ${index + 1} khỏi bài học trong bản nháp?`, confirmLabel: 'Gỡ khối', tone: 'danger' })) removeBlock(index)
            })()}><Trash2 size={16} aria-hidden="true" /></button>
          </div>
        </header>
        {folded.includes(index) ? null : <CourseBlockEditor value={block} number={index + 1} disabled={disabled} onChange={(next) => onChange({ ...value, blocks: value.blocks.map((item, position) => position === index ? next : item) })} />}
      </section>)}
    </div>
    <CoursePackagePicker value={value.practiceSetPackageIds} onChange={(practiceSetPackageIds) => onChange({ ...value, practiceSetPackageIds })} catalog={practiceSets} usedIds={usedPackageIds} disabled={disabled} />
  </div>
}
