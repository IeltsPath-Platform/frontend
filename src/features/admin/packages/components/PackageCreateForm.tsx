import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { AdminField } from '../../components/AdminField'
import { AdminSwitch } from '../../components/AdminSwitch'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { optionalText, requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { fetchCodeSuggestion } from '../../code-settings/api/codeSettingsApi'
import { useGeneratedCode } from '../../code-settings/lib/useGeneratedCode'
import { fetchCourses } from '../../courses/api/courseApi'
import { fetchLessons, fetchTopics } from '../../lessons/api/lessonApi'
import { useAdminResource } from '../../lib/useAdminResource'
import { createDraftVersion, createPackage, listPracticeSources } from '../api/packageApi'
import { PACKAGE_TYPE_LABEL, packageError } from '../lib/packageLabels'
import type { CreatePackageRequest, PackageType } from '../types'
import type { PlacementPool } from '~types/learningPath'
import { useAdminError } from '../../lib/useAdminError'

const CREATE_TYPES = ['PRACTICE_SET', 'PRACTICE_TEST', 'MOCK_TEST', 'PLACEMENT_TEST', 'QUIZ', 'TOPIC_TEST', 'COURSE_TEST'] as const

export function PackageCreateForm({ onCreated, onCancel, initialType }: {
  onCreated: (packageId: string) => void; onCancel: () => void; initialType?: string
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<(typeof CREATE_TYPES)[number]>(CREATE_TYPES.find((value) => value === initialType) ?? 'PRACTICE_SET')
  const [access, setAccess] = useState<'FREE' | 'PREMIUM'>('FREE')
  const [courseId, setCourseId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [sourceCode, setSourceCode] = useState('')
  const [placementPool, setPlacementPool] = useState<PlacementPool | ''>('')
  const [pending, setPending] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [, setError] = useAdminError()
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const courses = useAdminResource('package-create-courses', fetchCourses)
  const topics = useAdminResource('package-create-topics', fetchTopics)
  const lessons = useAdminResource(`package-create-lessons|${topicId}`, (signal) => topicId ? fetchLessons(topicId, signal) : Promise.resolve([]))
  const sources = useAdminResource('package-create-sources', listPracticeSources)
  const needsCourse = type === 'PRACTICE_SET' || type === 'TOPIC_TEST' || type === 'COURSE_TEST'
  const needsTopic = type === 'PRACTICE_SET' || type === 'TOPIC_TEST'
  // The code is generated from what the package will belong to, read the way the server reads the request below.
  const suggestionContext = {
    kind: 'PACKAGE' as const, packageType: type,
    ...(type === 'COURSE_TEST' && courseId ? { courseId } : {}),
    ...(type === 'TOPIC_TEST' && topicId ? { topicId } : {}),
    ...(type === 'PRACTICE_SET' && lessonId ? { lessonId } : {}),
  }
  const generated = useGeneratedCode({
    kind: 'PACKAGE', enabled: true, contextKey: JSON.stringify(suggestionContext),
    suggest: (signal) => fetchCodeSuggestion(suggestionContext, signal),
  })
  const { code } = generated
  const availableTopics = useMemo(() => topics.data?.filter((topic) => topic.courseId === courseId) ?? [], [topics.data, courseId])

  // Which of the choices below the type asks for, and whether each one is a real entry of its loaded list.
  const schema = useMemo(() => z.object({
    code: generated.required ? requiredText('Mã gói', 100) : optionalText('Mã gói', 100),
    title: requiredText('Tiêu đề gói', 255),
    placementPool: z.string(),
    courseId: z.string(),
    topicId: z.string(),
    lessonId: z.string(),
    sourceCode: z.string(),
  }).superRefine((value, ctx) => {
    const refuse = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    if (type === 'PLACEMENT_TEST' && !value.placementPool) refuse('placementPool', 'Chọn kho đề đầu vào.')
    if (needsCourse) {
      if (!value.courseId) refuse('courseId', 'Chọn khóa học.')
      else if (courses.status !== 'success' || !courses.data?.some((course) => course.id === value.courseId)) refuse('courseId', 'Chọn khóa học hợp lệ.')
    }
    if (needsTopic) {
      if (!value.topicId) refuse('topicId', 'Chọn chủ đề.')
      else if (topics.status !== 'success' || !availableTopics.some((topic) => topic.id === value.topicId)) refuse('topicId', 'Chọn chủ đề thuộc khóa học đã chọn.')
    }
    if (type === 'PRACTICE_SET') {
      if (!value.lessonId) refuse('lessonId', 'Chọn bài học.')
      else if (lessons.status !== 'success' || !lessons.data?.some((lesson) => lesson.id === value.lessonId)) refuse('lessonId', 'Chọn bài học thuộc chủ đề đã chọn.')
    }
    if (type === 'PRACTICE_TEST' && value.sourceCode && (sources.status !== 'success' || !sources.data?.some((source) => source.code === value.sourceCode))) {
      refuse('sourceCode', 'Chọn nguồn đề hợp lệ hoặc không dùng nguồn.')
    }
  }), [type, generated.required, needsCourse, needsTopic, courses.status, courses.data, topics.status, availableTopics, lessons.status, lessons.data, sources.status, sources.data])
  const form = useFormErrors(schema, { code, title, placementPool, courseId, topicId, lessonId, sourceCode })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending || createdId) return
    if (!form.validate()) return
    const body: CreatePackageRequest = {
      ...(generated.codeToSend !== undefined ? { code: generated.codeToSend } : {}), title: title.trim(), packageType: type, accessLevel: access,
      lessonId: type === 'PRACTICE_SET' ? lessonId : null,
      topicId: type === 'TOPIC_TEST' ? topicId : null,
      courseId: type === 'COURSE_TEST' ? courseId : null,
      sourceCode: type === 'PRACTICE_TEST' ? sourceCode || null : null,
      ...(type === 'PLACEMENT_TEST' && placementPool ? { placementPool } : {}),
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

  return <form aria-label="Tạo gói câu hỏi" className="adm-package-create adm-pc" noValidate onSubmit={(event) => void submit(event)}>
    {createdId && !pending ? <button className="adm-btn adm-btn--primary" type="button" onClick={() => onCreated(createdId)}>Mở gói đã tạo</button> : null}
    <fieldset className="adm-package-fields adm-pc__fields" disabled={pending || !!createdId}>
      <div className="adm-pc__row">
        <label className="adm-field"><span>Loại gói</span><select className="adm-select" value={type} onChange={(event) => { setType(event.target.value as Exclude<PackageType, 'LESSON'>); setError(null) }}>{CREATE_TYPES.map((value) => <option key={value} value={value}>{PACKAGE_TYPE_LABEL[value]}</option>)}</select></label>
        <div className="adm-pc__switch"><AdminSwitch checked={access === 'FREE'} onChange={(free) => setAccess(free ? 'FREE' : 'PREMIUM')}>Miễn phí</AdminSwitch></div>
      </div>
      <AdminField label="Tiêu đề gói" {...form.field('title')}><input className="adm-input" maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} /></AdminField>
      <AdminField label="Mã gói" {...form.field('code')}><input className="adm-input" disabled={generated.locked} maxLength={100} value={code} onChange={(event) => generated.onType(event.target.value)} /></AdminField>
      {type === 'PLACEMENT_TEST' || needsCourse || type === 'PRACTICE_TEST' ? <h3 className="adm-pc__heading">Gắn với</h3> : null}
      <div className="adm-pc__group">
      {type === 'PLACEMENT_TEST' ? <AdminField label="Kho đề đầu vào" {...form.field('placementPool')} required><select className="adm-select" value={placementPool} onChange={(event) => setPlacementPool(event.target.value as PlacementPool | '')}><option value="">Chọn kho</option><option value="BAND_0_3">Band 0–3</option><option value="BAND_3_5">Band 3–5</option><option value="BAND_5_9">Band 5–9</option></select></AdminField> : null}
      {needsCourse ? <>
        {courses.status === 'loading' ? <AdminLoading label="Đang tải khóa học…" /> : null}
        {courses.status === 'error' ? <AdminError message={courses.error!} onRetry={courses.reload} /> : null}
        <AdminField label="Khóa học" {...form.field('courseId')} required><select className="adm-select" disabled={courses.status !== 'success'} value={courseId} onChange={(event) => { setCourseId(event.target.value); setTopicId(''); setLessonId('') }}><option value="">Chọn khóa học</option>{courses.data?.map((course) => <option key={course.id} value={course.id}>{course.code} · {course.name}</option>)}</select></AdminField>
      </> : null}
      {needsTopic ? <>
        {topics.status === 'loading' ? <AdminLoading label="Đang tải chủ đề…" /> : null}
        {topics.status === 'error' ? <AdminError message={topics.error!} onRetry={topics.reload} /> : null}
        <AdminField label="Chủ đề" {...form.field('topicId')} required><select className="adm-select" disabled={!courseId || topics.status !== 'success'} value={topicId} onChange={(event) => { setTopicId(event.target.value); setLessonId('') }}><option value="">Chọn chủ đề</option>{availableTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.code} · {topic.name}</option>)}</select></AdminField>
      </> : null}
      {type === 'PRACTICE_SET' ? <>
        {topicId && lessons.status === 'loading' ? <AdminLoading label="Đang tải bài học…" /> : null}
        {topicId && lessons.status === 'error' ? <AdminError message={lessons.error!} onRetry={lessons.reload} /> : null}
        <AdminField label="Bài học" {...form.field('lessonId')} required><select className="adm-select" disabled={!topicId || lessons.status !== 'success'} value={lessonId} onChange={(event) => setLessonId(event.target.value)}><option value="">Chọn bài học</option>{lessons.data?.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.code} · {lesson.title}</option>)}</select></AdminField>
      </> : null}
      {type === 'PRACTICE_TEST' ? <>
        {sources.status === 'loading' ? <AdminLoading label="Đang tải nguồn đề…" /> : null}
        {sources.status === 'error' ? <AdminError message={sources.error!} onRetry={sources.reload} /> : null}
        <AdminField label="Nguồn đề" {...form.field('sourceCode')}><select className="adm-select" value={sourceCode} onChange={(event) => setSourceCode(event.target.value)}><option value="">Không (đề kiểm tra nội bộ của khóa)</option>{sources.data?.map((source) => <option key={source.code} value={source.code}>{source.name}</option>)}</select></AdminField>
      </> : null}
      </div>
      <div className="adm-form-footer"><button className="adm-btn" type="button" onClick={onCancel}>Đóng</button><button className="adm-btn adm-btn--primary" type="submit">{pending ? 'Đang tạo gói…' : 'Tạo gói và bản nháp'}</button></div>
    </fieldset>
  </form>
}
