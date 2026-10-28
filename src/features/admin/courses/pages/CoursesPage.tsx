import { useId, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { AdminDrawer } from '../../components/AdminLayer'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { fetchTopics } from '../../lessons/api/lessonApi'
import { AdminPage } from '../../pages/AdminPage'
import { fetchCourses } from '../api/courseApi'
import { CourseForm } from '../components/CourseForm'
import { CourseTabs, UNASSIGNED_TAB } from '../components/CourseTabs'
import { TopicTree } from '../components/TopicTree'
import type { Course } from '../types'
import type { TopicOption } from '../../lessons/types'
import '../courses.css'
import { useAdminError } from '../../lib/useAdminError'

export function CoursesPage() {
  const courses = useAdminResource('author-courses', fetchCourses)
  const topics = useAdminResource('author-course-topics', fetchTopics)
  const panelId = useId()
  const [selection, setSelection] = useState('')
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [addingTopic, setAddingTopic] = useState(false)
  const [, setActionError] = useAdminError()
  const [shownCourses, setShownCourses] = useState<Course[] | null>(null)
  const [shownTopics, setShownTopics] = useState<TopicOption[] | null>(null)
  if (courses.status === 'success' && courses.data !== shownCourses) setShownCourses(courses.data)
  if (topics.status === 'success' && topics.data !== shownTopics) setShownTopics(topics.data)
  const currentCourses = courses.status === 'success' ? courses.data : shownCourses
  const currentTopics = topics.status === 'success' ? topics.data : shownTopics
  const selectedId = selection || currentCourses?.[0]?.id || UNASSIGNED_TAB
  const course = currentCourses?.find((item) => item.id === selectedId)
  const rows = (currentTopics ?? []).filter((item) => selectedId === UNASSIGNED_TAB ? !item.courseId : item.courseId === selectedId)
  function select(id: string) { setSelection(id); setEditing(false); setAddingTopic(false); setActionError(null) }
  return <AdminPage title="Khóa học & chủ đề" subtitle="Quản lý khóa theo band, tổ chức chủ đề và mở danh sách bài học của từng chủ đề." plain actions={<button className="adm-btn adm-btn--primary" type="button" onClick={() => setCreating(true)}>Tạo khóa học</button>}>
    {creating ? <AdminDrawer title="Tạo khóa học" onClose={() => setCreating(false)}>
      {(close) => <CourseForm onCancel={close} onSaved={() => { courses.reload(); close() }} />}
    </AdminDrawer> : null}
    {courses.status === 'loading' ? <AdminLoading label="Đang tải khóa học…" /> : null}
    {courses.status === 'error' ? <AdminError message={courses.error!} onRetry={courses.reload} /> : null}
    {currentCourses ? <>
      {currentCourses.length === 0 ? <AdminEmpty title="Chưa có khóa học">Tạo khóa học đầu tiên hoặc gán các chủ đề hiện có.</AdminEmpty> : null}
      <section aria-label="Khóa học" className="adm-block">
        <CourseTabs courses={currentCourses} topics={currentTopics ?? []} selectedId={selectedId} onSelect={select} panelId={panelId} />
        <header className="adm-course-head">
          <div>
            <h2>{course?.name ?? 'Chủ đề chưa gán khóa'}</h2>
            <p className="adm-muted">
              {course
                ? <><code>{course.code}</code> · Band {course.bandLevel.toFixed(1)} · <span className={`adm-badge ${course.status === 'ACTIVE' ? 'adm-badge--ok' : 'adm-badge--muted'}`}>{course.status === 'ACTIVE' ? 'Đang dùng' : 'Ngừng dùng'}</span> · {rows.length} chủ đề</>
                : 'Các chủ đề này chưa thuộc khóa nào. Sửa chủ đề để gán vào một khóa.'}
            </p>
          </div>
          <div className="adm-course-head__actions">
            {course ? <button className="adm-btn" type="button" onClick={() => setEditing(true)}><Pencil aria-hidden="true" size={16} /> Sửa khóa học</button> : null}
            <button className="adm-btn adm-btn--primary" disabled={topics.status !== 'success' || addingTopic} type="button" onClick={() => setAddingTopic(true)}><Plus aria-hidden="true" size={16} /> Thêm chủ đề</button>
          </div>
        </header>
      </section>
      <div aria-labelledby={`course-tab-${selectedId}`} className="adm-course-panel" id={panelId} role="tabpanel">
        {editing && course ? <AdminDrawer title="Sửa khóa học" description={course.code} onClose={() => setEditing(false)}>
          {(close) => <CourseForm key={course.id} course={course} onCancel={close} onSaved={() => { courses.reload(); close() }} />}
        </AdminDrawer> : null}
        {topics.status === 'loading' ? <AdminLoading label="Đang tải chủ đề…" /> : null}
        {topics.status === 'error' ? <AdminError message={topics.error!} onRetry={topics.reload} /> : null}
        {currentTopics ? <TopicTree key={selectedId} topics={rows} allTopics={currentTopics} courses={currentCourses} courseId={selectedId === UNASSIGNED_TAB ? null : selectedId} onSaved={topics.reload} onError={setActionError} loading={topics.status !== 'success'} creating={addingTopic} onCreateClosed={() => setAddingTopic(false)} /> : null}
      </div>
    </> : null}
  </AdminPage>
}
