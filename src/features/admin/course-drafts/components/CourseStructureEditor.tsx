import { ArrowDown, ArrowUp } from 'lucide-react'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { listPackages } from '../../packages/api/packageApi'
import type { CourseStructure } from '../types'
import { CourseFinalTestEditor } from './CourseFinalTestEditor'
import { CourseTopicEditor } from './CourseTopicEditor'

export function CourseStructureEditor({ value, onChange, disabled }: {
  value: CourseStructure; onChange: (next: CourseStructure) => void; disabled: boolean
}) {
  const practiceSets = useAdminResource('course-draft-practice-sets', (signal) => listPackages({ type: 'PRACTICE_SET', status: 'PUBLISHED' }, signal))
  const milestoneTests = useAdminResource('course-draft-milestone-tests', (signal) => listPackages({ type: 'PRACTICE_TEST', status: 'PUBLISHED' }, signal))
  const usedPackageIds = [...value.topics.flatMap((topic) => topic.lessons.flatMap((lesson) => lesson.practiceSetPackageIds)), ...value.practiceTestMilestones.map((milestone) => milestone.packageId)]
  const milestoneOptions = (milestoneTests.data ?? []).filter((pkg) => !pkg.courseId && !pkg.lessonId)
  function change(next: CourseStructure) { if (!disabled) onChange(next) }
  function moveTopic(index: number, delta: number) {
    const topics = [...value.topics]
    const orders = topics.map((topic) => topic.sortOrder).sort((left, right) => left - right)
    ;[topics[index], topics[index + delta]] = [topics[index + delta]!, topics[index]!]
    change({ ...value, topics: topics.map((topic, position) => ({ ...topic, sortOrder: orders[position]! })) })
  }

  return <fieldset className="adm-course-draft-editor" disabled={disabled}>
    <legend className="adm-sr-only">Cấu trúc khóa học</legend>
    <section className="adm-card" aria-label="Thông tin khóa học">
      <h2>Thông tin khóa học</h2>
      {value.course ? <div className="adm-course-draft-grid">
        <label className="adm-field"><span>Mã khóa học</span><input className="adm-input" required maxLength={100} value={value.course.code} onChange={(event) => change({ ...value, course: { ...value.course!, code: event.target.value } })} /></label>
        <label className="adm-field"><span>Tên khóa học</span><input className="adm-input" required maxLength={255} value={value.course.name} onChange={(event) => change({ ...value, course: { ...value.course!, name: event.target.value } })} /></label>
        <label className="adm-field"><span>Band khóa học</span><select className="adm-select" value={value.course.bandLevel} onChange={(event) => change({ ...value, course: { ...value.course!, bandLevel: Number(event.target.value) } })}>{Array.from({ length: 19 }, (_, index) => index * 0.5).map((band) => <option key={band} value={band}>{band.toFixed(1)}</option>)}</select></label>
      </div> : <button className="adm-btn" type="button" onClick={() => change({ ...value, course: { code: '', name: '', bandLevel: 6.5 } })}>Thêm thông tin khóa học</button>}
      <p className="adm-muted">Mã dùng chữ, số, dấu chấm, gạch dưới hoặc gạch nối; tối đa 100 ký tự. Duyệt sẽ tạo khóa học chưa kích hoạt.</p>
    </section>
    <section aria-label="Chủ đề trong bản nháp">
      <h2>Chủ đề ({value.topics.length}/30)</h2>
      <p className="adm-muted">Lên/xuống chỉ đổi thứ tự trong bản nháp này. Nội dung đã có trong hệ thống được giữ nguyên.</p>
      {value.topics.map((topic, index) => <article className="adm-card adm-course-draft-topic-card" key={index} aria-label={`Chủ đề ${index + 1}`}>
        <h3>Chủ đề {index + 1}: {topic.name || 'Chưa đặt tên'}</h3>
        <CourseTopicEditor value={topic} number={index + 1} disabled={disabled} practiceSets={practiceSets} usedPackageIds={usedPackageIds} onChange={(next) => change({ ...value, topics: value.topics.map((item, position) => position === index ? next : item) })} />
        <div className="adm-course-draft-actions">
          <button className="adm-btn" type="button" disabled={disabled || index === 0} aria-label={`Đưa chủ đề ${index + 1} lên`} onClick={() => moveTopic(index, -1)}><ArrowUp size={16} aria-hidden="true" /></button>
          <button className="adm-btn" type="button" disabled={disabled || index === value.topics.length - 1} aria-label={`Đưa chủ đề ${index + 1} xuống`} onClick={() => moveTopic(index, 1)}><ArrowDown size={16} aria-hidden="true" /></button>
          <button className="adm-btn adm-btn--danger" type="button" onClick={() => { if (window.confirm(`Gỡ chủ đề ${index + 1} cùng các bài học khỏi bản nháp?`)) change({ ...value, topics: value.topics.filter((_, position) => position !== index) }) }}>Gỡ chủ đề {index + 1}</button>
        </div>
      </article>)}
      <button className="adm-btn" type="button" disabled={disabled || value.topics.length >= 30} onClick={() => change({ ...value, topics: [...value.topics, { code: '', name: '', skill: 'READING', sortOrder: Math.max(0, ...value.topics.map((topic) => topic.sortOrder)) + 1, lessons: [], topicTest: null }] })}>Thêm chủ đề</button>
    </section>
    <section className="adm-card">
      <CourseFinalTestEditor label="Đề cuối khóa" value={value.courseTest} disabled={disabled} onChange={(courseTest) => change({ ...value, courseTest })} />
      <p className="adm-muted">Duyệt sẽ tạo đề cuối rỗng ở bản nháp; soạn tiếp ở màn Đề & gói câu hỏi.</p>
    </section>
    <section className="adm-card" aria-label="Mốc đề luyện tập">
      <h2>Mốc đề luyện tập ({value.practiceTestMilestones.length}/100)</h2>
      <p className="adm-muted">Chọn đề luyện tập đã xuất bản, chưa gắn khóa học, và vị trí chủ đề hoàn tất trước mốc.</p>
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
  </fieldset>
}
