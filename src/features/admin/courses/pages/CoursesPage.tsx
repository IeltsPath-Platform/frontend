import { useState } from 'react'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { fetchTopics } from '../../lessons/api/lessonApi'
import { AdminPage } from '../../pages/AdminPage'
import { fetchCourses } from '../api/courseApi'
import { CourseForm } from '../components/CourseForm'
import { TopicTree } from '../components/TopicTree'
import type { Course } from '../types'
import type { TopicOption } from '../../lessons/types'
import '../courses.css'

export function CoursesPage() {
  const courses = useAdminResource('author-courses', fetchCourses)
  const topics = useAdminResource('author-course-topics', fetchTopics)
  const [selection, setSelection] = useState('')
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [shownCourses, setShownCourses] = useState<Course[] | null>(null)
  const [shownTopics, setShownTopics] = useState<TopicOption[] | null>(null)
  if (courses.status === 'success' && courses.data !== shownCourses) setShownCourses(courses.data)
  if (topics.status === 'success' && topics.data !== shownTopics) setShownTopics(topics.data)
  const currentCourses = courses.status === 'success' ? courses.data : shownCourses
  const currentTopics = topics.status === 'success' ? topics.data : shownTopics
  const selectedId = selection || currentCourses?.[0]?.id || 'unassigned'
  const course = currentCourses?.find((item) => item.id === selectedId)
  const rows = (currentTopics ?? []).filter((item) => selectedId === 'unassigned' ? !item.courseId : item.courseId === selectedId)
  function select(id: string) { setSelection(id); setEditing(false); setActionError(null) }
  return <AdminPage title="Khóa học & chủ đề" subtitle="Quản lý khóa theo band, tổ chức chủ đề và mở danh sách bài học của từng chủ đề." actions={<button className="adm-btn adm-btn--primary" type="button" onClick={() => setCreating((value) => !value)}>Tạo khóa học</button>}>
    {creating ? <CourseForm onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); courses.reload() }} /> : null}
    {courses.status === 'loading' ? <AdminLoading label="Đang tải khóa học…" /> : null}
    {courses.status === 'error' ? <AdminError message={courses.error!} onRetry={courses.reload} /> : null}
    {currentCourses ? <div className="adm-courses-layout">
      <aside aria-label="Danh sách khóa học">
        <label className="adm-field adm-course-mobile"><span>Chọn khóa học</span><select className="adm-select" value={selectedId} onChange={(event) => select(event.target.value)}>{currentCourses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="unassigned">Chủ đề chưa gán khóa</option></select></label>
        <div className="adm-course-desktop">{currentCourses.map((item) => <button className={`adm-course-choice${item.id === selectedId ? ' is-selected' : ''}`} type="button" key={item.id} aria-pressed={item.id === selectedId} onClick={() => select(item.id)}><code>{item.code}</code><strong>{item.name}</strong><span>Band {item.bandLevel.toFixed(1)} · {item.status === 'ACTIVE' ? 'Đang dùng' : 'Ngừng dùng'}</span></button>)}<button className={`adm-course-choice${selectedId === 'unassigned' ? ' is-selected' : ''}`} type="button" aria-pressed={selectedId === 'unassigned'} onClick={() => select('unassigned')}>Chủ đề chưa gán khóa</button></div>
        {currentCourses.length === 0 ? <AdminEmpty title="Chưa có khóa học">Tạo khóa học đầu tiên hoặc gán các chủ đề hiện có.</AdminEmpty> : null}
      </aside>
      <section className="adm-course-topics" aria-label="Chủ đề của khóa học">
        {actionError ? <div className="adm-alert adm-alert--error" role="alert">{actionError}</div> : null}
        <div className="adm-author-actions"><h2>{course?.name ?? 'Chủ đề chưa gán khóa'}</h2>{course ? <button className="adm-btn" type="button" onClick={() => setEditing((value) => !value)}>Sửa khóa học</button> : null}</div>
        {editing && course ? <CourseForm key={course.id} course={course} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); courses.reload() }} /> : null}
        {topics.status === 'loading' ? <AdminLoading label="Đang tải chủ đề…" /> : null}
        {topics.status === 'error' ? <AdminError message={topics.error!} onRetry={topics.reload} /> : null}
        {currentTopics ? <TopicTree key={selectedId} topics={rows} allTopics={currentTopics} courses={currentCourses} courseId={selectedId === 'unassigned' ? null : selectedId} onSaved={topics.reload} onError={setActionError} loading={topics.status !== 'success'} /> : null}
      </section>
    </div> : null}
  </AdminPage>
}
