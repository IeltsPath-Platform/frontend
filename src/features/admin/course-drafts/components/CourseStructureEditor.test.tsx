import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { answerConfirm } from '@/test/confirm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CourseStructure } from '../types'
import { CourseStructureEditor } from './CourseStructureEditor'

const packages = vi.hoisted(() => ({ listPackages: vi.fn(), getPackage: vi.fn() }))
const tree = vi.hoisted(() => ({ fetchKnowledgeTree: vi.fn() }))
const questions = vi.hoisted(() => ({ listQuestions: vi.fn(), getQuestion: vi.fn(), listVersionPassages: vi.fn() }))
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
    questions.listVersionPassages.mockResolvedValue([])
    questions.listQuestions.mockResolvedValue({ content: [{ id: 'question', currentPublishedVersionId: versionId, questionType: 'MULTIPLE_CHOICE', skill: 'READING' }] })
  })
  function show(value = structure, disabled = false) {
    const onChange = vi.fn()
    const view = render(<CourseStructureEditor value={value} disabled={disabled} onChange={onChange} />)
    return { ...view, onChange }
  }

  /** A lesson is edited in a drawer, opened from its row in the topic. */
  function openLesson() { chooseFromRowMenu(1, 'Sửa bài 1') }
  /** A row's actions sit behind its "..." button; open it and pick one by its accessible name. */
  function chooseFromRowMenu(row: number, action: string) {
    fireEvent.click(screen.getByRole('button', { name: `Hành động của bài ${row}` }))
    fireEvent.click(screen.getByRole('menuitem', { name: action }))
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

  it('folds every topic but the first to one row, and opens or folds them one by one or all at once', () => {
    show()
    const first = screen.getByRole('button', { name: /Chủ đề 1 Paraphrase/ })
    const second = screen.getByRole('button', { name: /Chủ đề 2 Inference/ })
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(second).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Mã chủ đề 2')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Mã chủ đề 1')).toBeInTheDocument()
    fireEvent.click(second)
    expect(screen.getByLabelText('Mã chủ đề 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn tất cả' }))
    expect(screen.queryByLabelText('Mã chủ đề 1')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Mã chủ đề 2')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mở tất cả' }))
    expect(screen.getByLabelText('Mã chủ đề 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Mã chủ đề 2')).toBeInTheDocument()
  })

  it('keeps a topic open or folded as it moves, and opens a topic just added', () => {
    const { onChange, rerender } = show()
    fireEvent.click(screen.getByRole('button', { name: 'Đưa chủ đề 1 xuống' }))
    const moved = onChange.mock.lastCall![0] as CourseStructure
    rerender(<CourseStructureEditor value={moved} disabled={false} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /Chủ đề 2 Paraphrase/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Chủ đề 1 Inference/ })).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Thêm chủ đề' }))
    const added = onChange.mock.lastCall![0] as CourseStructure
    rerender(<CourseStructureEditor value={added} disabled={false} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /Chủ đề 3 Chưa đặt tên/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Mã chủ đề 3')).toBeInTheDocument()
  })

  it('lists the lessons of a topic as rows and edits one in a drawer that closes with Xong', async () => {
    const { onChange } = show()
    const list = screen.getByRole('table', { name: 'Bài học của chủ đề 1' })
    expect(within(list).getAllByRole('row')).toHaveLength(3)
    expect(within(list).getByText('LESSON_A')).toBeInTheDocument()
    expect(screen.queryByLabelText('Mã bài học 1')).not.toBeInTheDocument()
    fireEvent.click(within(list).getByRole('button', { name: 'Bài học sau' }))
    const drawer = await screen.findByRole('dialog', { name: 'Bài 2: Bài học sau' })
    fireEvent.change(within(drawer).getByLabelText('Tiêu đề bài học 2'), { target: { value: 'Tiêu đề mới' } })
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[1]?.title).toBe('Tiêu đề mới')
    fireEvent.click(within(drawer).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Bài 2/ })).not.toBeInTheDocument())
  })

  it('adds a lesson and opens it straight away', async () => {
    const { onChange, rerender } = show()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm bài học' }))
    const next = onChange.mock.lastCall![0] as CourseStructure
    expect(next.topics[0]?.lessons).toHaveLength(3)
    rerender(<CourseStructureEditor value={next} disabled={false} onChange={onChange} />)
    expect(await screen.findByRole('dialog', { name: 'Bài 3: Chưa đặt tiêu đề' })).toBeInTheDocument()
  })

  it('folds a block of a lesson to its header and keeps it folded as the blocks move', () => {
    const { onChange, rerender } = show()
    openLesson()
    expect(screen.getByRole('button', { name: /Khối 1 · Văn bản/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Nội dung khối 1')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Câu hỏi của khối' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Khối 2 · Bài tập/ }))
    expect(screen.queryByRole('table', { name: 'Câu hỏi của khối' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Đưa khối 2 lên' }))
    const moved = onChange.mock.lastCall![0] as CourseStructure
    rerender(<CourseStructureEditor value={moved} disabled={false} onChange={onChange} />)
    expect(screen.getByRole('button', { name: /Khối 1 · Bài tập/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: /Khối 2 · Văn bản/ })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Mở tất cả' }))
    expect(screen.getByRole('table', { name: 'Câu hỏi của khối' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn tất cả' }))
    expect(screen.queryByLabelText('Nội dung khối 2')).not.toBeInTheDocument()
  })

  it('edits the minutes and the Markdown summary of a lesson, and empties them back to null', () => {
    const timed: CourseStructure = { ...structure, topics: [{ ...structure.topics[0]!, lessons: [{ ...structure.topics[0]!.lessons[0]!, estimatedMinutes: 15 }, structure.topics[0]!.lessons[1]!] }, structure.topics[1]!] }
    const { onChange } = show(timed)
    openLesson()
    expect(screen.getByLabelText('Thời lượng dự kiến (phút)')).toHaveValue(15)
    fireEvent.change(screen.getByLabelText('Thời lượng dự kiến (phút)'), { target: { value: '25' } })
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.estimatedMinutes).toBe(25)
    fireEvent.change(screen.getByLabelText('Thời lượng dự kiến (phút)'), { target: { value: '' } })
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.estimatedMinutes).toBeNull()
    fireEvent.change(screen.getByLabelText('Tóm tắt trang bài học (Markdown)'), { target: { value: '- one\n- two' } })
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.summaryMarkdown).toBe('- one\n- two')
  })

  it('keeps one slide link per lesson and removes it when the link is cleared', () => {
    const { onChange } = show()
    openLesson()
    fireEvent.change(screen.getByLabelText('Slide (đường dẫn)'), { target: { value: 'https://slides.example/deck' } })
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.resources).toEqual([{ type: 'SLIDE', title: 'Slide bài học', url: 'https://slides.example/deck' }])
  })

  it('shows a lesson slide and clearing its link drops the slide but keeps the documents', () => {
    const withBoth: CourseStructure = { ...structure, topics: [{ ...structure.topics[0]!, lessons: [{ ...structure.topics[0]!.lessons[0]!, resources: [
      { type: 'SLIDE', title: 'Slide bài học', url: 'https://slides.example/deck' }, { type: 'DOCUMENT', title: 'Phiếu bài tập', url: 'https://docs.example/sheet' }] }, structure.topics[0]!.lessons[1]!] }, structure.topics[1]!] }
    const { onChange } = show(withBoth)
    openLesson()
    expect(screen.getByLabelText('Slide (đường dẫn)')).toHaveValue('https://slides.example/deck')
    expect(within(screen.getByRole('table', { name: 'Tài liệu của bài' })).getByText('Phiếu bài tập')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Slide (đường dẫn)'), { target: { value: '' } })
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.resources).toEqual([{ type: 'DOCUMENT', title: 'Phiếu bài tập', url: 'https://docs.example/sheet' }])
  })

  it('adds a document with a valid link and refuses a bad one', async () => {
    const { onChange } = show()
    openLesson()
    const section = screen.getByRole('table', { name: 'Tài liệu của bài' }).closest('.adm-sec') as HTMLElement
    expect(within(section).getByText('Chưa có tài liệu nào.')).toBeInTheDocument()
    fireEvent.click(within(section).getByRole('button', { name: 'Thêm tài liệu' }))
    const form = await screen.findByRole('form', { name: 'Thêm tài liệu' })
    fireEvent.change(within(form).getByLabelText(/^Tên/), { target: { value: 'Phiếu bài tập' } })
    fireEvent.change(within(form).getByLabelText(/^Đường dẫn/), { target: { value: 'not a link' } })
    fireEvent.submit(form)
    expect(within(form).getByRole('alert')).toHaveTextContent('http://')
    fireEvent.change(within(form).getByLabelText(/^Đường dẫn/), { target: { value: 'https://docs.example/sheet' } })
    fireEvent.submit(form)
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.resources).toEqual([{ type: 'DOCUMENT', title: 'Phiếu bài tập', url: 'https://docs.example/sheet' }])
  })

  it('reorders lessons and blocks without changing their content', () => {
    const { onChange } = show()
    chooseFromRowMenu(1, 'Đưa bài 1 xuống')
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons.map((lesson) => lesson.code)).toEqual(['LESSON_B', 'LESSON_A'])
    openLesson()
    fireEvent.click(screen.getByRole('button', { name: 'Đưa khối 1 xuống' }))
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.blocks.map((block) => block.type)).toEqual(['EXERCISE', 'TEXT'])
  })

  it('edits text blocks and keeps exercise references intact', () => {
    const { onChange } = show()
    openLesson()
    fireEvent.change(screen.getByLabelText('Nội dung khối 1'), { target: { value: 'Nội dung tự soạn mới' } })
    const lesson = (onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]
    expect(lesson?.blocks[0]?.text).toBe('Nội dung tự soạn mới')
    expect(lesson?.blocks[1]?.questionRefs).toEqual(['import-one'])
  })

  it('reuses published learning questions while retaining imported references', async () => {
    const { onChange } = show()
    openLesson()
    const list = screen.getByRole('table', { name: 'Câu hỏi của khối' })
    expect(within(list).getByText('import-one')).toBeInTheDocument()
    expect(within(list).getByText('Mã nhập từ file')).toBeInTheDocument()
    fireEvent.click(within(list.closest('.adm-sec') as HTMLElement).getByRole('button', { name: 'Sửa lựa chọn' }))
    const chooser = await screen.findByRole('dialog', { name: 'Chọn câu hỏi cho khối' })
    fireEvent.click(await within(chooser).findByRole('checkbox', { name: /Trắc nghiệm/ }))
    expect(questions.listQuestions).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'LEARNING', status: 'PUBLISHED' }), expect.any(AbortSignal))
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.blocks[1]?.questionRefs).toEqual(['import-one', versionId])
  })

  it('shows the knowledge points of a lesson by name and removes one from its row', async () => {
    const { onChange } = show()
    openLesson()
    const table = await screen.findByRole('table', { name: 'Điểm kiến thức bài học 1' })
    expect(within(table).getByText('KP_ONE')).toBeInTheDocument()
    expect(within(table).getByText('Paraphrase')).toBeInTheDocument()
    fireEvent.click(within(table).getByRole('button', { name: 'Bỏ KP_ONE' }))
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.knowledgePointIds).toEqual([])
  })

  it('lists in the dialog a point already attached that the band does not suggest, ticked', async () => {
    tree.fetchKnowledgeTree.mockResolvedValue({ nodes: [
      { id: kp, code: 'KP_ONE', name: 'Paraphrase', skill: 'READING', cefrLevel: 'B1' },
      { id: otherKp, code: 'KP_TWO', name: 'Inference', skill: 'READING', cefrLevel: 'C1' },
    ] })
    show()
    openLesson()
    const table = await screen.findByRole('table', { name: 'Điểm kiến thức bài học 1' })
    expect(within(table).getByText('KP_ONE')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa lựa chọn' })[0]!)
    const dialog = await screen.findByRole('dialog', { name: 'Chọn điểm kiến thức' })
    expect(within(dialog).getByRole('checkbox', { name: /KP_ONE/ })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: /KP_TWO/ })).not.toBeChecked()
    expect(within(dialog).getByText(/1\/50 đã chọn/)).toBeInTheDocument()
  })

  it('lists the questions of an exercise block by code and type, opens one in full, and removes one from its row', async () => {
    const withQuestion: CourseStructure = { ...structure, topics: [{ ...structure.topics[0]!, lessons: [{ ...structure.topics[0]!.lessons[0]!, blocks: [{ type: 'EXERCISE', text: null, knowledgePointIds: [], questionRefs: [versionId] }] }] }] }
    questions.getQuestion.mockResolvedValue({ id: 'question', questionType: 'MULTIPLE_CHOICE', skill: 'READING', versions: [{ id: versionId, stem: 'Chọn tiêu đề phù hợp nhất cho đoạn văn', difficulty: 'HARD', options: [{ optionKey: 'A', content: 'Lựa chọn một', sortOrder: 1 }], answerSpecJson: '{"type":"CHOICE","correct":"A"}', explanation: 'Vì đoạn nói về ý chính.' }] })
    questions.listVersionPassages.mockResolvedValue([{ assetId: 'asset', text: 'A. In autumn, many trees lose their green colour.', source: 'LESSON', sourceName: 'Reading lesson' }])
    const { onChange } = show(withQuestion)
    openLesson()
    const table = await screen.findByRole('table', { name: 'Câu hỏi của khối' })
    expect(within(table).getByText('Trắc nghiệm')).toBeInTheDocument()
    expect(within(table).queryByText('Chọn tiêu đề phù hợp nhất cho đoạn văn')).not.toBeInTheDocument()
    fireEvent.click(within(table).getByRole('button', { name: 'Xem chi tiết câu hỏi 1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết câu hỏi' })
    expect(await within(dialog).findByText('Chọn tiêu đề phù hợp nhất cho đoạn văn')).toBeInTheDocument()
    expect(within(dialog).getByText('Lựa chọn một')).toBeInTheDocument()
    expect(await within(dialog).findByText('A. In autumn, many trees lose their green colour.')).toBeInTheDocument()
    expect(within(dialog).getByText('Lấy từ bài học: Reading lesson')).toBeInTheDocument()
    expect(within(dialog).getByText('Đáp án đúng: A.')).toBeInTheDocument()
    expect(within(dialog).getByText('Vì đoạn nói về ý chính.')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Chi tiết câu hỏi' })).not.toBeInTheDocument())
    fireEvent.click(within(table).getByRole('button', { name: 'Bỏ câu hỏi 1' }))
    expect((onChange.mock.lastCall![0] as CourseStructure).topics[0]?.lessons[0]?.blocks[0]?.questionRefs).toEqual([])
  })

  it('opens a practice set to read its sections, passage and questions, from the table and from the chooser', async () => {
    packages.getPackage.mockResolvedValue({
      id: practiceId, code: 'PS_A', title: 'Bộ luyện đọc', currentPublishedVersionId: 'v1',
      versions: [{ id: 'v1', sections: [{ id: 's1', title: 'Phần đọc', skill: 'READING', instructions: 'Đọc kỹ đoạn văn.', passage: 'A. Passage text.', questions: [{ id: 'q1', questionId: 'question', questionVersionId: versionId, stem: 'Which heading fits?' }] }] }],
    })
    const withSet: CourseStructure = { ...structure, topics: [{ ...structure.topics[0]!, lessons: [{ ...structure.topics[0]!.lessons[0]!, practiceSetPackageIds: [practiceId] }] }] }
    show(withSet)
    openLesson()
    const table = await screen.findByRole('table', { name: 'Gói luyện tập đã chọn' })
    await within(table).findByText('Bộ luyện đọc')
    fireEvent.click(within(table).getByRole('button', { name: 'Xem chi tiết gói PS_A' }))
    const dialog = await screen.findByRole('dialog', { name: 'Bộ luyện đọc' })
    expect(await within(dialog).findByText('A. Passage text.')).toBeInTheDocument()
    expect(within(dialog).getByText('Đọc kỹ đoạn văn.')).toBeInTheDocument()
    expect(within(dialog).getByText('Which heading fits?')).toBeInTheDocument()
    questions.getQuestion.mockResolvedValue({ id: 'question', questionType: 'MULTIPLE_CHOICE', skill: 'READING', versions: [{ id: versionId, stem: 'Which heading fits?', options: [{ optionKey: 'A', content: 'The central idea', sortOrder: 1 }], answerSpecJson: '{"type":"CHOICE","correct":"A"}', explanation: 'It covers the whole text.' }] })
    expect(within(dialog).queryByText('The central idea')).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByText('Which heading fits?', { selector: 'summary' }))
    expect(await within(dialog).findByText('The central idea')).toBeInTheDocument()
    expect(within(dialog).getByText('Đáp án đúng: A.')).toBeInTheDocument()
    expect(within(dialog).getByText('It covers the whole text.')).toBeInTheDocument()
    expect(packages.getPackage).toHaveBeenCalledWith(practiceId, expect.any(AbortSignal))
  })

  it('offers published unlinked practice sets and excludes sets already attached to a lesson', async () => {
    const { onChange } = show()
    openLesson()
    const section = within(screen.getAllByRole('region', { name: 'Gói luyện tập của bài' })[0]!)
    expect(await section.findByText('Chưa gắn gói luyện tập nào.')).toBeInTheDocument()
    fireEvent.click(section.getByRole('button', { name: 'Chọn gói luyện tập' }))
    const dialog = await screen.findByRole('dialog', { name: 'Chọn gói luyện tập' })
    expect(within(dialog).queryByRole('checkbox', { name: /LINKED/ })).not.toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Lọc gói luyện tập'), { target: { value: 'zzz' } })
    expect(within(dialog).getByText('Không có gói khớp bộ lọc.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Lọc gói luyện tập'), { target: { value: 'ps_a' } })
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /PS_A/ }))
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
    openLesson()
    expect(screen.getByLabelText('Nội dung khối 1')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Tên khóa học'), { target: { value: 'Không được đổi' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('requires confirmation before removing a topic and keeps all data when cancelled', async () => {
    const { onChange } = show()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ chủ đề 1' }))
    await answerConfirm(false)
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ chủ đề 1' }))
    await answerConfirm(true)
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
    expect((onChange.mock.lastCall![0] as CourseStructure).topics).toHaveLength(1)
  })
})
