import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Eye, Pencil } from 'lucide-react'
import { AdminDrawer } from '../../components/AdminLayer'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { InfiniteCount, InfiniteSentinel } from '../../components/InfiniteSentinel'
import { fetchCourses } from '../../courses/api/courseApi'
import { fetchLessons, fetchTopics } from '../../lessons/api/lessonApi'
import { useAdminResource } from '../../lib/useAdminResource'
import { useInfiniteList } from '../../lib/useInfiniteList'
import { AdminPage } from '../../pages/AdminPage'
import { listPackages } from '../api/packageApi'
import { PackageCreateForm } from '../components/PackageCreateForm'
import { PackageEditorDrawer } from './PackageEditorPage'
import { PackagePreviewDialog } from '../components/PackagePreviewDialog'
import { PACKAGE_STATUS_LABEL, PACKAGE_TYPE_LABEL } from '../lib/packageLabels'
import { PACKAGE_TYPES, type PackageFilters, type PackageType } from '../types'
import '../packages.css'

/** Practice tests and placement tests are managed on their own screens; the server leaves them out of this list. */
const MANAGED_ELSEWHERE: readonly PackageType[] = ['PRACTICE_TEST', 'PLACEMENT_TEST']
const CREATABLE_TYPES = PACKAGE_TYPES.filter((type) => !MANAGED_ELSEWHERE.includes(type))
const PAGE_SIZE = 25

export function PackagesPage() {
  const [search, setSearch] = useSearchParams()
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [courseId, setCourseId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [previewing, setPreviewing] = useState<{ id: string; title: string } | null>(null)
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  useEffect(() => { const timer = window.setTimeout(() => setQuery(text.trim()), 300); return () => window.clearTimeout(timer) }, [text])
  const courses = useAdminResource('package-filter-courses', fetchCourses)
  const topics = useAdminResource('package-filter-topics', fetchTopics)
  const lessons = useAdminResource(`package-filter-lessons:${topicId}`, (signal) => topicId ? fetchLessons(topicId, signal) : Promise.resolve([]))
  const filters: PackageFilters = { type: type as PackageFilters['type'] || undefined, status: status as PackageFilters['status'] || undefined, courseId: courseId || undefined, topicId: topicId || undefined, lessonId: lessonId || undefined, q: query || undefined, excludeTypes: [...MANAGED_ELSEWHERE] }
  const filterKey = JSON.stringify(filters)
  const packages = useInfiniteList(`packages:${filterKey}`, (page, signal) => listPackages({ ...filters, page, size: PAGE_SIZE }, signal))
  const rows = packages.items
  const creating = search.has('create')
  // The package being edited sits in the address (?package=…), so a refresh or a shared link reopens the same drawer.
  const editingId = z.guid().safeParse(search.get('package')).data
  function closeEditor() { packages.refresh(); setSearch((previous) => { const next = new URLSearchParams(previous); next.delete('package'); next.delete('version'); return next }) }
  return <AdminPage title="Đề & gói câu hỏi" subtitle="Tạo gói đề, soạn các phiên bản và xuất bản khi nội dung đã sẵn sàng." actions={<button className="adm-btn adm-btn--primary" type="button" disabled={creating} onClick={() => setSearch((previous) => { const next = new URLSearchParams(previous); next.set('create', 'PRACTICE_SET'); return next })}>Gói mới</button>}>
    <div className="adm-package-workspace">
      {creating ? <AdminDrawer title="Gói mới" onClose={() => setSearch((previous) => { const next = new URLSearchParams(previous); next.delete('create'); return next })}>
        {(close) => <PackageCreateForm initialType={search.get('create') ?? undefined} onCancel={close} onCreated={(packageId) => setSearch((previous) => { const next = new URLSearchParams(previous); next.delete('create'); next.set('package', packageId); return next })} />}
      </AdminDrawer> : null}
      <p>Đề luyện tập nằm ở <Link to="/content-author/practice-tests">Thư viện luyện đề</Link>; đề đầu vào nằm ở <Link to="/content-author/placement-tests">Đề đầu vào</Link>.</p>
      <section aria-label="Bộ lọc gói" className="adm-package-form-grid">
        <label className="adm-field"><span>Tìm mã hoặc tiêu đề</span><input className="adm-input" type="search" value={text} onChange={(event) => setText(event.target.value)} /></label>
        <label className="adm-field"><span>Loại gói</span><select className="adm-select" value={type} onChange={(event) => setType(event.target.value)}><option value="">Tất cả loại</option>{CREATABLE_TYPES.map((item) => <option key={item} value={item}>{PACKAGE_TYPE_LABEL[item]}</option>)}</select></label>
        <label className="adm-field"><span>Trạng thái gói</span><select className="adm-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(PACKAGE_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="adm-field"><span>Lọc khóa học</span><select className="adm-select" value={courseId} disabled={courses.status !== 'success'} onChange={(event) => { setCourseId(event.target.value); setTopicId(''); setLessonId('') }}><option value="">Tất cả khóa học</option>{courses.data?.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
        <label className="adm-field"><span>Lọc chủ đề</span><select className="adm-select" value={topicId} disabled={topics.status !== 'success'} onChange={(event) => { setTopicId(event.target.value); setLessonId('') }}><option value="">Tất cả chủ đề</option>{topics.data?.filter((topic) => !courseId || topic.courseId === courseId).map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
        <label className="adm-field"><span>Lọc bài học</span><select className="adm-select" value={lessonId} disabled={!topicId || lessons.status !== 'success'} onChange={(event) => setLessonId(event.target.value)}><option value="">Tất cả bài học</option>{lessons.data?.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
      </section>
      {courses.status === 'error' ? <AdminError message={courses.error!} onRetry={courses.reload} /> : null}
      {topics.status === 'error' ? <AdminError message={topics.error!} onRetry={topics.reload} /> : null}
      {lessons.status === 'error' ? <AdminError message={lessons.error!} onRetry={lessons.reload} /> : null}
      {packages.status === 'loading' && rows.length === 0 ? <AdminLoading label="Đang tải gói đề…" /> : null}
      {packages.status === 'error' ? <AdminError message={packages.error!} onRetry={packages.reload} /> : null}
      {packages.status === 'success' && !rows.length ? <AdminEmpty title="Chưa có gói phù hợp">Đổi bộ lọc hoặc tạo gói mới.</AdminEmpty> : null}
      {rows.length ? <><InfiniteCount items={rows.length} noun="gói" total={packages.total} /><div className="adm-table-wrap"><table className="adm-table adm-table--sticky"><thead><tr><th className="adm-stt" scope="col">STT</th><th>Mã và tiêu đề</th><th>Loại</th><th>Truy cập</th><th>Trạng thái</th><th>Phiên bản</th><th>Cập nhật</th><th className="adm-col-actions" scope="col">Hành động</th></tr></thead><tbody>{rows.map((pkg, index) => <tr key={pkg.id}>
        <td className="adm-stt">{index + 1}</td><td><Link to={{ search: `?package=${pkg.id}` }}>{pkg.code} · {pkg.title}</Link></td><td>{PACKAGE_TYPE_LABEL[pkg.packageType]}</td><td>{pkg.accessLevel === 'FREE' ? 'Miễn phí' : 'Premium'}</td><td><span className="adm-badge">{PACKAGE_STATUS_LABEL[pkg.status]}</span></td><td>{pkg.latestVersionNumber ?? 'Chưa có'} {pkg.hasDraft ? <span className="adm-badge adm-badge--warn">Có bản nháp</span> : null}</td><td>{new Date(pkg.updatedAt).toLocaleString('vi-VN')}</td>
        <td className="adm-col-actions"><AdminRowMenu label={`Hành động của gói ${pkg.code}`} items={[
          { key: 'edit', label: 'Chỉnh sửa', ariaLabel: `Chỉnh sửa gói ${pkg.code}`, icon: <Pencil aria-hidden="true" size={16} />, onSelect: () => setSearch((previous) => { const next = new URLSearchParams(previous); next.set('package', pkg.id); return next }) },
          { key: 'detail', label: 'Chi tiết', ariaLabel: `Chi tiết gói ${pkg.code}`, icon: <Eye aria-hidden="true" size={16} />, onSelect: () => setPreviewing({ id: pkg.id, title: `${pkg.code} · ${pkg.title}` }) },
        ]} /></td>
      </tr>)}</tbody></table></div></> : null}
      <InfiniteSentinel hasMore={packages.hasMore} itemCount={rows.length} loadingMore={packages.loadingMore} moreError={packages.moreError} noun="gói" onReachEnd={packages.loadMore} onRetry={packages.retryMore} resetKey={filterKey} />
      {editingId ? <PackageEditorDrawer packageId={editingId} onClose={closeEditor} /> : null}
      {previewing ? <PackagePreviewDialog packageId={previewing.id} title={previewing.title} onClose={() => setPreviewing(null)} /> : null}
    </div>
  </AdminPage>
}
