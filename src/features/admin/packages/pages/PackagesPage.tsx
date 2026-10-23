import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { fetchCourses } from '../../courses/api/courseApi'
import { fetchLessons, fetchTopics } from '../../lessons/api/lessonApi'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { listPackages } from '../api/packageApi'
import { PackageCreateForm } from '../components/PackageCreateForm'
import { PACKAGE_STATUS_LABEL, PACKAGE_TYPE_LABEL } from '../lib/packageLabels'
import { PACKAGE_TYPES, type PackageFilters } from '../types'
import '../packages.css'

export function PackagesPage() {
  const [search, setSearch] = useSearchParams()
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [courseId, setCourseId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [id, setId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  useEffect(() => { const timer = window.setTimeout(() => setQuery(text.trim()), 300); return () => window.clearTimeout(timer) }, [text])
  const courses = useAdminResource('package-filter-courses', fetchCourses)
  const topics = useAdminResource('package-filter-topics', fetchTopics)
  const lessons = useAdminResource(`package-filter-lessons:${topicId}`, (signal) => topicId ? fetchLessons(topicId, signal) : Promise.resolve([]))
  const filters: PackageFilters = { type: type as PackageFilters['type'] || undefined, status: status as PackageFilters['status'] || undefined, courseId: courseId || undefined, topicId: topicId || undefined, lessonId: lessonId || undefined, q: query || undefined }
  const packages = useAdminResource(`packages:${JSON.stringify(filters)}`, (signal) => listPackages(filters, signal))
  const creating = search.has('create')
  function open(event: FormEvent) {
    event.preventDefault()
    const parsed = z.uuid().safeParse(id.trim())
    if (!parsed.success) { setError('Nhập ID gói hợp lệ (UUID).'); return }
    navigate(`/content-author/packages/${parsed.data}`)
  }
  return <AdminPage title="Đề & gói câu hỏi" subtitle="Tạo gói đề, soạn các phiên bản và xuất bản khi nội dung đã sẵn sàng." actions={<button className="adm-btn adm-btn--primary" type="button" disabled={creating} onClick={() => setSearch((previous) => { const next = new URLSearchParams(previous); next.set('create', 'PRACTICE_SET'); return next })}>Gói mới</button>}>
    <div className="adm-package-workspace">
      {creating ? <PackageCreateForm initialType={search.get('create') ?? undefined} onCancel={() => setSearch((previous) => { const next = new URLSearchParams(previous); next.delete('create'); return next })} onCreated={(packageId) => navigate(`/content-author/packages/${packageId}`)} /> : null}
      <section aria-label="Bộ lọc gói" className="adm-package-form-grid">
        <label className="adm-field"><span>Tìm mã hoặc tiêu đề</span><input className="adm-input" type="search" value={text} onChange={(event) => setText(event.target.value)} /></label>
        <label className="adm-field"><span>Loại gói</span><select className="adm-select" value={type} onChange={(event) => setType(event.target.value)}><option value="">Tất cả loại</option>{PACKAGE_TYPES.map((item) => <option key={item} value={item}>{PACKAGE_TYPE_LABEL[item]}</option>)}</select></label>
        <label className="adm-field"><span>Trạng thái gói</span><select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(PACKAGE_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="adm-field"><span>Lọc khóa học</span><select className="adm-select" value={courseId} disabled={courses.status !== 'success'} onChange={(event) => { setCourseId(event.target.value); setTopicId(''); setLessonId('') }}><option value="">Tất cả khóa học</option>{courses.data?.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
        <label className="adm-field"><span>Lọc chủ đề</span><select className="adm-select" value={topicId} disabled={topics.status !== 'success'} onChange={(event) => { setTopicId(event.target.value); setLessonId('') }}><option value="">Tất cả chủ đề</option>{topics.data?.filter((topic) => !courseId || topic.courseId === courseId).map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
        <label className="adm-field"><span>Lọc bài học</span><select className="adm-select" value={lessonId} disabled={!topicId || lessons.status !== 'success'} onChange={(event) => setLessonId(event.target.value)}><option value="">Tất cả bài học</option>{lessons.data?.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
      </section>
      {courses.status === 'error' ? <AdminError message={courses.error!} onRetry={courses.reload} /> : null}
      {topics.status === 'error' ? <AdminError message={topics.error!} onRetry={topics.reload} /> : null}
      {lessons.status === 'error' ? <AdminError message={lessons.error!} onRetry={lessons.reload} /> : null}
      {packages.status === 'loading' ? <AdminLoading label="Đang tải gói đề…" /> : null}
      {packages.status === 'error' ? <AdminError message={packages.error!} onRetry={packages.reload} /> : null}
      {packages.status === 'success' && !packages.data?.length ? <AdminEmpty title="Chưa có gói phù hợp">Đổi bộ lọc hoặc tạo gói mới.</AdminEmpty> : null}
      {packages.data?.length ? <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Mã và tiêu đề</th><th>Loại</th><th>Truy cập</th><th>Trạng thái</th><th>Phiên bản</th><th>Cập nhật</th></tr></thead><tbody>{packages.data.map((pkg) => <tr key={pkg.id}>
        <td><Link to={`/content-author/packages/${pkg.id}`}>{pkg.code} · {pkg.title}</Link></td><td>{PACKAGE_TYPE_LABEL[pkg.packageType]}</td><td>{pkg.accessLevel === 'FREE' ? 'Miễn phí' : 'Premium'}</td><td><span className="adm-badge">{PACKAGE_STATUS_LABEL[pkg.status]}</span></td><td>{pkg.latestVersionNumber ?? 'Chưa có'} {pkg.hasDraft ? <span className="adm-badge adm-badge--warn">Có bản nháp</span> : null}</td><td>{new Date(pkg.updatedAt).toLocaleString('vi-VN')}</td>
      </tr>)}</tbody></table></div> : null}
      <details><summary>Mở trực tiếp bằng ID</summary><form className="adm-card" aria-label="Mở gói có sẵn" noValidate onSubmit={open}>
        <h2>Mở gói có sẵn</h2>
        <label className="adm-field"><span>ID gói (UUID)</span><input className="adm-input" value={id} onChange={(event) => setId(event.target.value)} required autoCapitalize="none" spellCheck={false} /></label>
        {error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}
        <button className="adm-btn adm-btn--primary" type="submit">Mở gói</button>
      </form></details>
    </div>
  </AdminPage>
}
