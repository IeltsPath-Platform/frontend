import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CourseStructure } from '../types'
import { CourseStructureEditor } from './CourseStructureEditor'

const packages = vi.hoisted(() => ({ listPackages: vi.fn() }))
const tree = vi.hoisted(() => ({ fetchKnowledgeTree: vi.fn() }))
const questions = vi.hoisted(() => ({ listQuestions: vi.fn(), getQuestion: vi.fn() }))
vi.mock('../../packages/api/packageApi', () => packages)
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => tree)
vi.mock('../../questions/api/questionApi', () => questions)
const kp = '11111111-1111-4111-8111-111111111111'
const otherKp = '22222222-2222-4222-8222-222222222222'
const versionId = '33333333-3333-4333-8333-333333333333'
const practiceId = '44444444-4444-4444-8444-444444444444'
const milestoneId = '55555555-5555-4555-8555-555555555555'
const structure: CourseStructure = {
  course: { code: 'READING65', name: 'Đọc band 6.5', bandLevel: 6.5 },
  topics: [
    { code: 'TOPIC_A', name: 'Paraphrase', skill: 'READING', sortOrder: 970, topicTest: { code: 'TT_A', title: 'Đề cuối A' }, lessons: [
      { code: 'LESSON_A', title: 'Nhận diện cách diễn đạt', summary: '', knowledgePointIds: [kp], practiceSetPackageIds: [], blocks: [
        { type: 'TEXT', text: 'Văn bản tác giả', knowledgePointIds: [], questionRefs: [] },
        { type: 'EXERCISE', text: null, knowledgePointIds: [], questionRefs: ['import-one'] },
      ] },
      { code: 'LESSON_B', title: 'Bài học sau', summary: null, knowledgePointIds: [], practiceSetPackageIds: [], blocks: [] },
    ] },
    { code: 'TOPIC_B', name: 'Inference', skill: 'READING', sortOrder: 980, lessons: [], topicTest: null },
  ],
  courseTest: { code: 'CT', title: 'Đề cuối khóa đọc' }, practiceTestMilestones: [], gaps: [],
}

describe('CourseStructureEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    packages.listPackages.mockImplementation(async ({ type }: { type: string }) => type === 'PRACTICE_SET'
      ? [{ id: practiceId, code: 'PS_A', title: 'Bộ luyện đọc', lessonId: null, courseId: null }, { id: 'linked', code: 'LINKED', title: 'Bộ đã gắn', lessonId: 'lesson', courseId: null }]
      : [{ id: milestoneId, code: 'PT_A', title: 'Đề luyện đọc', lessonId: null, courseId: null }])
    tree.fetchKnowledgeTree.mockResolvedValue({ nodes: [{ id: kp, code: 'KP_ONE', name: 'Paraphrase' }, { id: otherKp, code: 'KP_TWO', name: 'Inference' }] })
    questions.listQuestions.mockResolvedValue({ content: [{ id: 'question', currentPublishedVersionId: versionId, questionType: 'MULTIPLE_CHOICE', skill: 'READING' }] })
  })
  function show(value = structure, disabled = false) {
    const onChange = vi.fn()
    const view = render(<CourseStructureEditor value={value} disabled={disabled} onChange={onChange} />)
    return { ...view, onChange }
  }

  it('edits course metadata immutably through the controlled callback', () => {
    const { onChange } = show()
    fireEvent.change(screen.getByLabelText('Tên khóa học'), { target: { value: 'Khóa đọc được hiệu chỉnh' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ course: { ...structure.course, name: 'Khóa đọc được hiệu chỉnh' } }))
    expect(structure.course?.name).toBe('Đọc band 6.5')
    expect(screen.getByLabelText('Tên khóa học')).toHaveValue('Đọc band 6.5')
  })

  it('reorders only draft topics while preserving the available sort order positions', () => {
    const { onChange } = show()
    fireEvent.click(screen.getByRole('button', { name: 'Đưa chủ đề 1 xuống' }))
    const next = onChange.mock.calls[0]![0] as CourseStructure
    expect(next.topics.map((topic) => topic.code)).toEqual(['TOPIC_B', 'TOPIC_A'])
    expect(next.topics.map((topic) => topic.sortOrder)).toEqual([970, 980])
    expect(structure.topics[0]?.code).toBe('TOPIC_A')
  })

  it('reorders lessons and blocks without changing their content', () => {
    const { onChange } = show()
    fireEvent.click(screen.getByRole('button', { name: 'Đưa bài 1 xuống' }))
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons.map((lesson) => lesson.code)).toEqual(['LESSON_B', 'LESSON_A'])
    fireEvent.click(screen.getByRole('button', { name: 'Đưa khối 1 xuống' }))
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.blocks.map((block) => block.type)).toEqual(['EXERCISE', 'TEXT'])
  })

  it('edits text blocks and keeps exercise references intact', () => {
    const { onChange } = show()
    fireEvent.change(screen.getByLabelText('Nội dung khối 1'), { target: { value: 'Nội dung tự soạn mới' } })
    const lesson = (onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]
    expect(lesson?.blocks[0]?.text).toBe('Nội dung tự soạn mới')
    expect(lesson?.blocks[1]?.questionRefs).toEqual(['import-one'])
  })

  it('reuses published learning questions while retaining imported references', async () => {
    const { onChange } = show()
    fireEvent.click(await screen.findByRole('checkbox', { name: /Trắc nghiệm/ }))
    expect(questions.listQuestions).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'LEARNING', status: 'PUBLISHED' }), expect.any(AbortSignal))
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.blocks[1]?.questionRefs).toEqual(['import-one', versionId])
  })

  it('offers published unlinked practice sets and excludes sets already attached to a lesson', async () => {
    const { onChange } = show()
    const picker = within(screen.getAllByRole('region', { name: 'Gói luyện tập của bài' })[0]!)
    fireEvent.click(await picker.findByRole('checkbox', { name: /PS_A/ }))
    expect(picker.queryByRole('checkbox', { name: /LINKED/ })).not.toBeInTheDocument()
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.practiceSetPackageIds).toEqual([practiceId])
    expect(packages.listPackages).toHaveBeenCalledWith({ type: 'PRACTICE_SET', status: 'PUBLISHED' }, expect.any(AbortSignal))
  })

  it('creates editable milestone rows bound to a draft topic sequence', async () => {
    const { onChange, rerender } = show()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mốc đề luyện tập' }))
    const next = onChange.mock.lastCall![0] as CourseStructure
    rerender(<CourseStructureEditor value={next} disabled={false} onChange={onChange} />)
    await screen.findByRole('option', { name: 'PT_A · Đề luyện đọc' })
    fireEvent.change(screen.getByLabelText('Đề luyện tập mốc 1'), { target: { value: milestoneId } })
    expect((onChange.mock.lastCall![0] as CourseStructure).practiceTestMilestones).toEqual([{ packageId: milestoneId, afterTopicSequence: 1 }])
    fireEvent.change(screen.getByLabelText('Mốc 1 sau chủ đề'), { target: { value: '2' } })
    expect((onChange.mock.lastCall![0] as CourseStructure).practiceTestMilestones[0]?.afterTopicSequence).toBe(2)
  })

  it('supports empty draft metadata and final test fields without supplying invented codes', () => {
    const { onChange } = show({ course: null, topics: [], courseTest: null, practiceTestMilestones: [], gaps: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm thông tin khóa học' }))
    expect((onChange.mock.lastCall![0] as CourseStructure).course).toEqual({ code: '', name: '', bandLevel: 6.5 })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm đề cuối khóa' }))
    expect((onChange.mock.lastCall![0] as CourseStructure).courseTest).toEqual({ code: '', title: '' })
  })

  it('locks every input and ignores attempted changes in a read-only draft', () => {
    const { onChange } = show(structure, true)
    expect(screen.getByLabelText('Tên khóa học')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Thêm chủ đề' })).toBeDisabled()
    expect(screen.getByLabelText('Nội dung khối 1')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Tên khóa học'), { target: { value: 'Không được đổi' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('requires confirmation before removing a topic and keeps all data when cancelled', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { onChange } = show()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ chủ đề 1' }))
    expect(onChange).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ chủ đề 1' }))
    expect((onChange.mock.lastCall![0] as CourseStructure).topics).toHaveLength(1)
    confirm.mockRestore()
  })
})
