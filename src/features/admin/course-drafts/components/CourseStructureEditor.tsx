import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Trash2 } from 'lucide-react'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { SKILL_LABEL } from '../../courses/types'
import { useAdminResource } from '../../lib/useAdminResource'
import { fetchKnowledgeTree } from '../../knowledge-graph/api/knowledgeGraphApi'
import { listPackages } from '../../packages/api/packageApi'
import { CourseDraftCatalogContext } from '../lib/courseDraftCatalog'
import { listAllLearningQuestions } from '../lib/listAllLearningQuestions'
import type { CourseStructure } from '../types'
import { CourseFinalTestEditor } from './CourseFinalTestEditor'
import { CourseTopicEditor } from './CourseTopicEditor'

export function CourseStructureEditor({ value, onChange, disabled }: {
  value: CourseStructure; onChange: (next: CourseStructure) => void; disabled: boolean
}) {
  const { confirm, confirmDialog } = useAdminConfirm()
  const practiceSets = useAdminResource('course-draft-practice-sets', (signal) => listPackages({ type: 'PRACTICE_SET', status: 'PUBLISHED' }, signal))
  const milestoneTests = useAdminResource('course-draft-milestone-tests', (signal) => listPackages({ type: 'PRACTICE_TEST', status: 'PUBLISHED' }, signal))
  const knowledge = useAdminResource('course-draft-knowledge', (signal) => fetchKnowledgeTree({}, signal))
  const questions = useAdminResource('course-draft-questions', (signal) => listAllLearningQuestions(signal))
  const usedPackageIds = [...value.topics.flatMap((topic) => topic.lessons.flatMap((lesson) => lesson.practiceSetPackageIds)), ...value.practiceTestMilestones.map((milestone) => milestone.packageId)]
  const milestoneOptions = (milestoneTests.data ?? []).filter((pkg) => !pkg.courseId && !pkg.lessonId)
  // Topics are folded to one row each so a long course stays short to scroll; the first one starts open.
  const [open, setOpen] = useState<number[]>(() => (value.topics.length ? [0] : []))
  const isOpen = (index: number) => open.includes(index)
  function toggleTopic(index: number) { setOpen((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index])) }
  function change(next: CourseStructure) { if (!disabled) onChange(next) }
  function moveTopic(index: number, delta: number) {
    const topics = [...value.topics]
    const orders = topics.map((topic) => topic.sortOrder).sort((left, right) => left - right)
    ;[topics[index], topics[index + delta]] = [topics[index + delta]!, topics[index]!]
    change({ ...value, topics: topics.map((topic, position) => ({ ...topic, sortOrder: orders[position]! })) })
    setOpen((current) => current.map((item) => (item === index ? index + delta : item === index + delta ? index : item)))
  }
  function removeTopic(index: number) {
    change({ ...value, topics: value.topics.filter((_, position) => position !== index) })
    setOpen((current) => current.filter((item) => item !== index).map((item) => (item > index ? item - 1 : item)))
  }
  function addTopic() {
    change({ ...value, topics: [...value.topics, { code: '', name: '', skill: 'READING', sortOrder: Math.max(0, ...value.topics.map((topic) => topic.sortOrder)) + 1, lessons: [], topicTest: null }] })
    setOpen((current) => [...current, value.topics.length])
  }

  return <CourseDraftCatalogContext value={{ knowledge, questions, bandLevel: value.course?.bandLevel ?? null }}><fieldset className="adm-course-draft-editor" disabled={disabled}>
    {confirmDialog}
    <legend className="adm-sr-only">Cấu trúc khóa học</legend>
    <section className="adm-block" aria-label="Thông tin khóa học">
      <h2>Thông tin khóa học</h2>
      {value.course ? <div className="adm-course-draft-grid">
        <label className="adm-field"><span>Mã khóa học</span><input className="adm-input" required maxLength={100} value={value.course.code} onChange={(event) => change({ ...value, course: { ...value.course!, code: event.target.value } })} /></label>
        <label className="adm-field"><span>Tên khóa học</span><input className="adm-input" required maxLength={255} value={value.course.name} onChange={(event) => change({ ...value, course: { ...value.course!, name: event.target.value } })} /></label>
        <label className="adm-field"><span>Band khóa học</span><select className="adm-select" value={value.course.bandLevel} onChange={(event) => change({ ...value, course: { ...value.course!, bandLevel: Number(event.target.value) } })}>{Array.from({ length: 19 }, (_, index) => index * 0.5).map((band) => <option key={band} value={band}>{band.toFixed(1)}</option>)}</select></label>
      </div> : <button className="adm-btn" type="button" onClick={() => change({ ...value, course: { code: '', name: '', bandLevel: 6.5 } })}>Thêm thông tin khóa học</button>}
    </section>
    <section className="adm-draft-topics" aria-label="Chủ đề trong bản nháp">
      <div className="adm-draft-topics__head">
        <h2>Chủ đề <span className="adm-draft-topics__count" title="Đã có / tối đa 30 chủ đề trong một khóa học">{value.topics.length}/30</span></h2>
        {value.topics.length > 1 ? <div className="adm-draft-topics__bulk">
          <button className="adm-btn" type="button" onClick={() => setOpen(value.topics.map((_, index) => index))}>Mở tất cả</button>
          <button className="adm-btn" type="button" onClick={() => setOpen([])}>Thu gọn tất cả</button>
        </div> : null}
      </div>
      {value.topics.map((topic, index) => <article className={`adm-block adm-tcard${isOpen(index) ? ' is-open' : ''}`} key={index} aria-label={`Chủ đề ${index + 1}`}>
        <header className="adm-tcard__head">
          <h3 className="adm-tcard__title">
            <button aria-controls={`course-topic-${index}`} aria-expanded={isOpen(index)} className="adm-tcard__toggle" onClick={() => toggleTopic(index)} type="button">
              <ChevronDown aria-hidden="true" size={18} />
              <span className="adm-tcard__num">Chủ đề {index + 1}</span>
              <strong>{topic.name || 'Chưa đặt tên'}</strong>
            </button>
          </h3>
          <span className="adm-badge adm-badge--muted">{SKILL_LABEL[topic.skill]}</span>
          <span className="adm-muted adm-tcard__count">{topic.lessons.length} bài học</span>
          <div className="adm-tcard__actions">
            <button className="adm-icon-btn" type="button" disabled={disabled || index === 0} aria-label={`Đưa chủ đề ${index + 1} lên`} onClick={() => moveTopic(index, -1)}><ArrowUp size={16} aria-hidden="true" /></button>
            <button className="adm-icon-btn" type="button" disabled={disabled || index === value.topics.length - 1} aria-label={`Đưa chủ đề ${index + 1} xuống`} onClick={() => moveTopic(index, 1)}><ArrowDown size={16} aria-hidden="true" /></button>
            <button className="adm-icon-btn adm-icon-btn--danger" type="button" aria-label={`Gỡ chủ đề ${index + 1}`} onClick={() => void (async () => {
              if (await confirm({ title: 'Gỡ chủ đề khỏi bản nháp?', message: `Gỡ chủ đề ${index + 1} cùng các bài học khỏi bản nháp?`, confirmLabel: 'Gỡ chủ đề', tone: 'danger' })) removeTopic(index)
            })()}><Trash2 size={16} aria-hidden="true" /></button>
          </div>
        </header>
        {isOpen(index) ? <div className="adm-tcard__body" id={`course-topic-${index}`}>
          <CourseTopicEditor value={topic} number={index + 1} disabled={disabled} practiceSets={practiceSets} usedPackageIds={usedPackageIds} onChange={(next) => change({ ...value, topics: value.topics.map((item, position) => position === index ? next : item) })} />
        </div> : null}
      </article>)}
      <button className="adm-btn" type="button" disabled={disabled || value.topics.length >= 30} onClick={addTopic}>Thêm chủ đề</button>
    </section>
    <section className="adm-block" aria-label="Mốc đề luyện tập">
      <h2>Mốc đề luyện tập ({value.practiceTestMilestones.length}/100)</h2>
      {milestoneTests.status === 'loading' ? <AdminLoading label="Đang tải đề luyện tập…" /> : null}
      {milestoneTests.status === 'error' ? <AdminError message={milestoneTests.error!} onRetry={milestoneTests.reload} /> : null}
      {value.practiceTestMilestones.map((milestone, index) => <div className="adm-course-draft-milestone" key={index}>
        <label className="adm-field"><span>Đề luyện tập mốc {index + 1}</span><select className="adm-select" value={milestone.packageId} onChange={(event) => change({ ...value, practiceTestMilestones: value.practiceTestMilestones.map((item, position) => position === index ? { ...item, packageId: event.target.value } : item) })}>
          <option value="">Chọn đề luyện tập</option>
          {milestone.packageId && !milestoneOptions.some((pkg) => pkg.id === milestone.packageId) ? <option value={milestone.packageId}>{milestone.packageId} · Cần kiểm tra lại</option> : null}
          {milestoneOptions.map((pkg) => <option key={pkg.id} value={pkg.id} disabled={pkg.id !== milestone.packageId && usedPackageIds.includes(pkg.id)}>{pkg.code} · {pkg.title}</option>)}
        </select></label>
        <label className="adm-field"><span>Mốc {index + 1} sau chủ đề</span><select className="adm-select" value={milestone.afterTopicSequence} onChange={(event) => change({ ...value, practiceTestMilestones: value.practiceTestMilestones.map((item, position) => position === index ? { ...item, afterTopicSequence: Number(event.target.value) } : item) })}>
          {milestone.afterTopicSequence > value.topics.length ? <option value={milestone.afterTopicSequence}>{milestone.afterTopicSequence} · Không còn chủ đề tương ứng</option> : null}
          {value.topics.map((topic, topicIndex) => <option key={topicIndex} value={topicIndex + 1}>{topicIndex + 1} · {topic.name || 'Chưa đặt tên'}</option>)}
        </select></label>
        <button className="adm-btn adm-btn--danger" type="button" onClick={() => change({ ...value, practiceTestMilestones: value.practiceTestMilestones.filter((_, position) => position !== index) })}>Gỡ mốc {index + 1}</button>
      </div>)}
      <button className="adm-btn" type="button" disabled={disabled || !value.topics.length || value.practiceTestMilestones.length >= 100} onClick={() => change({ ...value, practiceTestMilestones: [...value.practiceTestMilestones, { packageId: '', afterTopicSequence: 1 }] })}>Thêm mốc đề luyện tập</button>
    </section>
    <section className="adm-block">
      <CourseFinalTestEditor label="Đề cuối khóa" value={value.courseTest} disabled={disabled} onChange={(courseTest) => change({ ...value, courseTest })} />
    </section>
  </fieldset></CourseDraftCatalogContext>
}
