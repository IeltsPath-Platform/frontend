import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { fetchCourses } from '../../courses/api/courseApi'
import { fetchLessons, fetchTopics } from '../../lessons/api/lessonApi'
import { useAdminResource } from '../../lib/useAdminResource'
import { createDraftVersion, createPackage, listPracticeSources } from '../api/packageApi'
import { PACKAGE_TYPE_LABEL, packageError } from '../lib/packageLabels'
import type { CreatePackageRequest, PackageType } from '../types'

const CREATE_TYPES = ['PRACTICE_SET', 'PRACTICE_TEST', 'MOCK_TEST', 'PLACEMENT_TEST', 'QUIZ', 'TOPIC_TEST', 'COURSE_TEST'] as const

export function PackageCreateForm({ onCreated, onCancel, initialType }: {
  onCreated: (packageId: string) => void; onCancel: () => void; initialType?: string
}) {
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<(typeof CREATE_TYPES)[number]>(CREATE_TYPES.find((value) => value === initialType) ?? 'PRACTICE_SET')
  const [access, setAccess] = useState<'FREE' | 'PREMIUM'>('FREE')
  const [courseId, setCourseId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [sourceCode, setSourceCode] = useState('')
  const [pending, setPending] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const courses = useAdminResource('package-create-courses', fetchCourses)
  const topics = useAdminResource('package-create-topics', fetchTopics)
  const lessons = useAdminResource(`package-create-lessons|${topicId}`, (signal) => topicId ? fetchLessons(topicId, signal) : Promise.resolve([]))
  const sources = useAdminResource('package-create-sources', listPracticeSources)
  const needsCourse = type === 'PRACTICE_SET' || type === 'TOPIC_TEST' || type === 'COURSE_TEST'
  const needsTopic = type === 'PRACTICE_SET' || type === 'TOPIC_TEST'
  const availableTopics = topics.data?.filter((topic) => topic.courseId === courseId) ?? []

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending || createdId) return
    if (!code.trim() || !title.trim()) { setError('Nhập mã và tiêu đề gói.'); return }
    if (needsCourse && (courses.status !== 'success' || !courses.data?.some((course) => course.id === courseId))) { setError('Chọn khóa học hợp lệ.'); return }
    if (needsTopic && (topics.status !== 'success' || !availableTopics.some((topic) => topic.id === topicId))) { setError('Chọn chủ đề thuộc khóa học đã chọn.'); return }
    if (type === 'PRACTICE_SET' && (lessons.status !== 'success' || !lessons.data?.some((lesson) => lesson.id === lessonId))) { setError('Chọn bài học thuộc chủ đề đã chọn.'); return }
    if (type === 'PRACTICE_TEST' && sourceCode && (sources.status !== 'success' || !sources.data?.some((source) => source.code === sourceCode))) { setError('Chọn nguồn đề hợp lệ hoặc không dùng nguồn.'); return }
    const body: CreatePackageRequest = {
      code: code.trim(), title: title.trim(), packageType: type, accessLevel: access,
      lessonId: type === 'PRACTICE_SET' ? lessonId : null,
      topicId: type === 'TOPIC_TEST' ? topicId : null,
      courseId: type === 'COURSE_TEST' ? courseId : null,
      sourceCode: type === 'PRACTICE_TEST' ? sourceCode || null : null,
    }
    setPending(true); setError(null)
    try {
      const pkg = await createPackage(body)
      if (mounted.current) setCreatedId(pkg.id)
      try {
        await createDraftVersion(pkg.id, '{}')
        if (mounted.current) onCreated(pkg.id)
      } catch (reason) {
        if (mounted.current) setError(`Gói đã được tạo nhưng chưa tạo được phiên bản nháp. ${packageError(reason)} Mở gói để tạo bản nháp; không gửi lại yêu cầu tạo gói.`)
      }
    } catch (reason) { if (mounted.current) setError(packageError(reason)) }
    finally { if (mounted.current) setPending(false) }
  }

  return <form aria-label="Tạo gói câu hỏi" className="adm-card adm-package-create" noValidate onSubmit={(event) => void submit(event)}>
    <h2>Gói mới</h2>
    {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
    {createdId && !pending ? <button className="adm-btn adm-btn--primary" type="button" onClick={() => onCreated(createdId)}>Mở gói đã tạo</button> : null}
    <fieldset className="adm-package-fields" disabled={pending || !!createdId}>
      <label className="adm-field"><span>Mã gói</span><input className="adm-input" required maxLength={100} value={code} onChange={(event) => setCode(event.target.value)} /></label>
      <label className="adm-field"><span>Tiêu đề gói</span><input className="adm-input" required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="adm-field"><span>Loại gói</span><select className="adm-select" value={type} onChange={(event) => { setType(event.target.value as Exclude<PackageType, 'LESSON'>); setError(null) }}>{CREATE_TYPES.map((value) => <option key={value} value={value}>{PACKAGE_TYPE_LABEL[value]}</option>)}</select></label>
      <label className="adm-field"><span>Truy cập</span><select className="adm-select" value={access} onChange={(event) => setAccess(event.target.value as 'FREE' | 'PREMIUM')}><option value="FREE">Miễn phí</option><option value="PREMIUM">Premium</option></select></label>
      {needsCourse ? <>
        {courses.status === 'loading' ? <AdminLoading label="Đang tải khóa học…" /> : null}
        {courses.status === 'error' ? <AdminError message={courses.error!} onRetry={courses.reload} /> : null}
        <label className="adm-field"><span>Khóa học</span><select className="adm-select" required disabled={courses.status !== 'success'} value={courseId} onChange={(event) => { setCourseId(event.target.value); setTopicId(''); setLessonId('') }}><option value="">Chọn khóa học</option>{courses.data?.map((course) => <option key={course.id} value={course.id}>{course.code} · {course.name}</option>)}</select></label>
      </> : null}
      {needsTopic ? <>
        {topics.status === 'loading' ? <AdminLoading label="Đang tải chủ đề…" /> : null}
        {topics.status === 'error' ? <AdminError message={topics.error!} onRetry={topics.reload} /> : null}
        <label className="adm-field"><span>Chủ đề</span><select className="adm-select" required disabled={!courseId || topics.status !== 'success'} value={topicId} onChange={(event) => { setTopicId(event.target.value); setLessonId('') }}><option value="">Chọn chủ đề</option>{availableTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.code} · {topic.name}</option>)}</select></label>
      </> : null}
      {type === 'PRACTICE_SET' ? <>
        {topicId && lessons.status === 'loading' ? <AdminLoading label="Đang tải bài học…" /> : null}
        {topicId && lessons.status === 'error' ? <AdminError message={lessons.error!} onRetry={lessons.reload} /> : null}
        <label className="adm-field"><span>Bài học</span><select className="adm-select" required disabled={!topicId || lessons.status !== 'success'} value={lessonId} onChange={(event) => setLessonId(event.target.value)}><option value="">Chọn bài học</option>{lessons.data?.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.code} · {lesson.title}</option>)}</select></label>
      </> : null}
      {type === 'PRACTICE_TEST' ? <>
        {sources.status === 'loading' ? <AdminLoading label="Đang tải nguồn đề…" /> : null}
        {sources.status === 'error' ? <AdminError message={sources.error!} onRetry={sources.reload} /> : null}
        <label className="adm-field"><span>Nguồn đề (tùy chọn)</span><select className="adm-select" value={sourceCode} onChange={(event) => setSourceCode(event.target.value)}><option value="">Không (đề kiểm tra nội bộ của khóa)</option>{sources.data?.map((source) => <option key={source.code} value={source.code}>{source.name}</option>)}</select></label>
      </> : null}
      <div className="adm-package-actions"><button className="adm-btn adm-btn--primary" type="submit">{pending ? 'Đang tạo gói…' : 'Tạo gói và bản nháp'}</button><button className="adm-btn" type="button" onClick={onCancel}>Hủy</button></div>
    </fieldset>
  </form>
}
