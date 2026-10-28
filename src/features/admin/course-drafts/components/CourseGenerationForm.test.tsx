import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CourseDraft } from '../types'
import { CourseGenerationForm } from './CourseGenerationForm'
import { CourseKnowledgePicker } from './CourseKnowledgePicker'

const api = vi.hoisted(() => ({ requestCourseDraft: vi.fn() }))
const tree = vi.hoisted(() => ({ fetchKnowledgeTree: vi.fn() }))
vi.mock('../api/courseDraftApi', () => api)
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => tree)
const knowledgePointId = '11111111-1111-4111-8111-111111111111'
const draft: CourseDraft = {
  id: '22222222-2222-4222-8222-222222222222', kind: 'COURSE', status: 'QUEUED', request: {}, result: null,
  errorCode: null, model: null, promptVersion: null, createdAt: '2026-10-23T00:00:00Z', finishedAt: null, reviewedAt: null, reviewNote: null,
}

describe('CourseGenerationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.requestCourseDraft.mockResolvedValue(draft)
    tree.fetchKnowledgeTree.mockResolvedValue({ nodes: [
      { id: knowledgePointId, code: 'KP_PARAPHRASE', name: 'Nhận diện cách diễn đạt', skill: 'READING', cefrLevel: 'C1' },
      { id: '33333333-3333-4333-8333-333333333333', code: 'KP_LISTEN_NUMBERS', name: 'Nghe số', skill: 'LISTENING', cefrLevel: 'B1' },
      { id: '44444444-4444-4444-8444-444444444444', code: 'KP_READ_BASICS', name: 'Đọc nền', skill: 'READING', cefrLevel: 'B2' },
      { id: '77777777-7777-4777-8777-777777777777', code: 'KP_READ_FOUNDATION', name: 'Đọc nhập môn', skill: 'READING', cefrLevel: 'B1' },
      { id: '55555555-5555-4555-8555-555555555555', code: 'KP_READ_ADVANCED', name: 'Đọc nâng cao', skill: 'READING', cefrLevel: 'C2' },
      { id: '66666666-6666-4666-8666-666666666666', code: 'TRAP_WRONG_PARAGRAPH', name: 'Tìm nhầm đoạn văn', skill: 'READING', cefrLevel: null },
    ] })
  })
  function submit() { fireEvent.submit(screen.getByRole('form', { name: 'Sinh bản nháp khóa học' })) }

  async function openChooser() {
    fireEvent.click(await screen.findByRole('button', { name: /^(Chọn điểm kiến thức|Sửa lựa chọn)$/ }))
    return await screen.findByRole('dialog', { name: 'Chọn điểm kiến thức' })
  }
  async function closeChooser(dialog: HTMLElement) {
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Chọn điểm kiến thức' })).not.toBeInTheDocument())
  }

  async function pickParaphrase() {
    const dialog = await openChooser()
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /KP_PARAPHRASE/ }))
    await closeChooser(dialog)
  }

  it('submits the picked knowledge points with the other fields, and no topic phrases', async () => {
    const onCreated = vi.fn()
    render(<CourseGenerationForm onCreated={onCreated} onCancel={vi.fn()} />)
    await pickParaphrase()
    expect(within(screen.getByRole('table', { name: 'Điểm kiến thức đã chọn' })).getByText('KP_PARAPHRASE')).toBeInTheDocument()
    submit()
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(draft))
    expect(api.requestCourseDraft).toHaveBeenCalledWith({ bandLevel: 6.5, skills: ['READING'], topics: [], knowledgePointIds: [knowledgePointId], lessonCount: 8, instructions: '', includePrerequisites: false })
  })

  describe('prerequisites', () => {
    const basicsId = '44444444-4444-4444-8444-444444444444'
    const foundationId = '77777777-7777-4777-8777-777777777777'
    /** An edge points from the prerequisite to the point that depends on it: foundation, then basics, then paraphrase. */
    beforeEach(async () => {
      const current = await tree.fetchKnowledgeTree()
      tree.fetchKnowledgeTree.mockResolvedValue({ ...current, edges: [{ from: foundationId, to: basicsId }, { from: basicsId, to: knowledgePointId }] })
    })
    const table = () => screen.getByRole('table', { name: 'Điểm kiến thức đã chọn' })
    /** The codes of the lines of the table, top to bottom. */
    const codes = () => within(table()).getAllByRole('row').slice(1).map((row) => row.querySelector('code')?.textContent)
    const openChart = async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Xem sơ đồ' }))
      return await screen.findByRole('dialog', { name: 'Sơ đồ điểm kiến thức' })
    }

    it('brings the prerequisites of a picked point', async () => {
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      await pickParaphrase()

      expect(codes()).toHaveLength(3)
      // The change shows in the table, so no toast repeats it.
      expect(screen.queryByText(/kiến thức tiên quyết/)).not.toBeInTheDocument()
    })

    it('lists the picks in the table as a tree, the goal first and what it needs indented beneath it', async () => {
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      await pickParaphrase()

      expect(codes()).toEqual(['KP_PARAPHRASE', 'KP_READ_BASICS', 'KP_READ_FOUNDATION'])
      const depth = (code: string) => (within(table()).getByText(code).closest('.adm-kp-treecell') as HTMLElement).style.getPropertyValue('--depth')
      expect([depth('KP_PARAPHRASE'), depth('KP_READ_BASICS'), depth('KP_READ_FOUNDATION')]).toEqual(['0', '1', '2'])
      // Nothing about prerequisites is written into the rows; the shape of the tree says it.
      expect(within(table()).queryByText(/Tiên quyết|Cần học trước/)).not.toBeInTheDocument()
    })

    it('folds a point of the table, and keeps the picks when it does', async () => {
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      await pickParaphrase()

      fireEvent.click(screen.getByRole('button', { name: 'Thu gọn KP_READ_BASICS' }))
      expect(codes()).toEqual(['KP_PARAPHRASE', 'KP_READ_BASICS'])
      expect(screen.getByRole('button', { name: 'Mở KP_READ_BASICS' })).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByText('3/40')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Mở KP_READ_BASICS' }))
      expect(codes()).toHaveLength(3)
      // Each row folds by itself; there is no button that folds or opens them all.
      expect(screen.queryByRole('button', { name: /Thu gọn tất cả|Mở tất cả/ })).not.toBeInTheDocument()
    })

    it('draws the same points in a chart of boxes, the goal on top and what it needs in the boxes beneath', async () => {
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      await pickParaphrase()
      const dialog = await openChart()

      const box = (code: RegExp) => within(dialog).getByRole('checkbox', { name: code }).closest('li') as HTMLElement
      const goal = box(/^KP_PARAPHRASE/)
      const basics = box(/^KP_READ_BASICS/)
      expect(within(goal).getByRole('checkbox', { name: /^KP_READ_BASICS/ })).toBeInTheDocument()
      expect(within(goal).getByRole('checkbox', { name: /^KP_READ_FOUNDATION/ })).toBeInTheDocument()
      expect(within(basics).getByRole('checkbox', { name: /^KP_READ_FOUNDATION/ })).toBeInTheDocument()
      expect(within(basics).queryByRole('checkbox', { name: /^KP_PARAPHRASE/ })).not.toBeInTheDocument()
      expect(within(dialog).getByText(/^Điểm nằm dưới phải học trước điểm ngay trên nó\./)).toBeInTheDocument()
    })

    it('hangs the whole chart from one box for the course band, with every goal joined to it', async () => {
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      await pickParaphrase()
      const dialog = await openChart()

      const root = within(dialog).getByText('Khóa học band 6.5').closest('li') as HTMLElement
      expect(within(root).getByText('Đọc')).toBeInTheDocument()
      expect(within(root).getAllByRole('checkbox')).toHaveLength(within(dialog).getAllByRole('checkbox').length)
      expect(within(dialog).getAllByText('Khóa học band 6.5')).toHaveLength(1)
    })

    it('zooms the chart in and out in steps, stops at both ends, and goes back to 100%', async () => {
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      const dialog = await openChart()
      const zoom = within(within(dialog).getByRole('group', { name: 'Thu phóng sơ đồ' }))
      expect(zoom.getByText('100%')).toBeInTheDocument()
      expect(zoom.getByRole('button', { name: /^Đặt lại về 100%/ })).toBeDisabled()

      fireEvent.click(zoom.getByRole('button', { name: 'Thu nhỏ' }))
      expect(zoom.getByText('90%')).toBeInTheDocument()
      for (let times = 0; times < 5; times += 1) fireEvent.click(zoom.getByRole('button', { name: 'Thu nhỏ' }))
      expect(zoom.getByText('40%')).toBeInTheDocument()
      expect(zoom.getByRole('button', { name: 'Thu nhỏ' })).toBeDisabled()

      fireEvent.click(zoom.getByRole('button', { name: /^Đặt lại về 100%/ }))
      expect(zoom.getByText('100%')).toBeInTheDocument()
      for (let times = 0; times < 4; times += 1) fireEvent.click(zoom.getByRole('button', { name: 'Phóng to' }))
      expect(zoom.getByText('200%')).toBeInTheDocument()
      expect(zoom.getByRole('button', { name: 'Phóng to' })).toBeDisabled()
    })

    it('draws a point that two goals need once, and names the other goal in a note on its box', async () => {
      const current = await tree.fetchKnowledgeTree()
      const secondId = '88888888-8888-4888-8888-888888888888'
      tree.fetchKnowledgeTree.mockResolvedValue({
        nodes: [...current.nodes, { id: secondId, code: 'KP_SECOND', name: 'Mục tiêu thứ hai', skill: 'READING', cefrLevel: 'C1' }],
        edges: [...current.edges, { from: basicsId, to: secondId }],
      })
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      const dialog = await openChart()

      expect(within(dialog).getAllByRole('checkbox', { name: /^KP_READ_BASICS/ })).toHaveLength(1)
      expect(within(dialog).getByText(/Cũng là tiên quyết của KP_SECOND/)).toBeInTheDocument()
    })

    it('takes everything below a point that is unticked, even while the goal above it stays picked', async () => {
      const goal = '91111111-1111-4111-8111-111111111111'
      const middle = '92222222-2222-4222-8222-222222222222'
      const lower = '93333333-3333-4333-8333-333333333333'
      const lowest = '94444444-4444-4444-8444-444444444444'
      const shared = '95555555-5555-4555-8555-555555555555'
      tree.fetchKnowledgeTree.mockResolvedValue({
        nodes: [
          { id: goal, code: 'KP_GOAL', name: 'Đích', skill: 'READING', cefrLevel: 'B2' },
          { id: middle, code: 'KP_MIDDLE', name: 'Giữa', skill: 'READING', cefrLevel: 'B2' },
          { id: lower, code: 'KP_LOWER', name: 'Dưới', skill: 'READING', cefrLevel: 'B1' },
          { id: lowest, code: 'KP_LOWEST', name: 'Dưới cùng', skill: 'READING', cefrLevel: 'B1' },
          { id: shared, code: 'KP_SHARED', name: 'Dùng chung', skill: 'READING', cefrLevel: 'B1' },
        ],
        // lowest -> lower -> middle -> goal, and shared feeds both the middle point and the goal directly.
        edges: [{ from: lowest, to: lower }, { from: lower, to: middle }, { from: middle, to: goal }, { from: shared, to: middle }, { from: shared, to: goal }],
      })
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      const dialog = await openChart()
      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_GOAL/ }))
      expect(within(dialog).getByText('5/40 đã chọn')).toBeInTheDocument()

      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_MIDDLE/ }))

      // The goal stays; the chain beneath the middle point goes with it. KP_SHARED stays: the goal needs it directly.
      expect(within(dialog).getByRole('checkbox', { name: /^KP_GOAL/ })).toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_SHARED/ })).toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_MIDDLE/ })).not.toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_LOWER/ })).not.toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_LOWEST/ })).not.toBeChecked()
      expect(within(dialog).getByText('2/40 đã chọn')).toBeInTheDocument()
    })

    it('keeps a point that a point still picked needs directly when the chain beside it is cut, and shows that link', async () => {
      const skim = 'a1111111-1111-4111-8111-111111111111'
      const headings = 'a2222222-2222-4222-8222-222222222222'
      const idea = 'a3333333-3333-4333-8333-333333333333'
      const identify = 'a4444444-4444-4444-8444-444444444444'
      const topic = 'a5555555-5555-4555-8555-555555555555'
      tree.fetchKnowledgeTree.mockResolvedValue({
        nodes: [
          { id: skim, code: 'KP_SKIM', name: 'Skim', skill: 'READING', cefrLevel: 'B2' },
          { id: headings, code: 'KP_HEADINGS', name: 'Chọn tiêu đề đoạn', skill: 'READING', cefrLevel: 'B2' },
          { id: idea, code: 'KP_IDEA', name: 'Ý chính hay chi tiết', skill: 'READING', cefrLevel: 'B1' },
          { id: identify, code: 'KP_IDENTIFY', name: 'Identify the main idea', skill: 'READING', cefrLevel: 'B1' },
          { id: topic, code: 'KP_TOPIC', name: 'Câu chủ đề', skill: 'READING', cefrLevel: 'B1' },
        ],
        // topic -> identify -> idea -> headings -> skim, and topic is also a prerequisite of headings directly.
        edges: [{ from: topic, to: identify }, { from: identify, to: idea }, { from: idea, to: headings }, { from: headings, to: skim }, { from: topic, to: headings }],
      })
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      const dialog = await openChart()
      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_SKIM/ }))
      expect(within(dialog).getByText('5/40 đã chọn')).toBeInTheDocument()
      // The direct link is not hidden: the point is drawn once, and the chart says it also serves KP_HEADINGS.
      expect(within(dialog).getAllByRole('checkbox', { name: /^KP_TOPIC/ })).toHaveLength(1)
      expect(within(dialog).getByText(/Cũng là tiên quyết của KP_HEADINGS/)).toBeInTheDocument()

      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_IDEA/ }))

      expect(within(dialog).getByRole('checkbox', { name: /^KP_IDENTIFY/ })).not.toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_TOPIC/ })).toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_HEADINGS/ })).toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_SKIM/ })).toBeChecked()
      expect(within(dialog).getByText('3/40 đã chọn')).toBeInTheDocument()
    })

    it('follows a chain through a prerequisite of the same level when a goal is unticked', async () => {
      const a = '91111111-1111-4111-8111-111111111111'
      const b = '92222222-2222-4222-8222-222222222222'
      const c = '93333333-3333-4333-8333-333333333333'
      tree.fetchKnowledgeTree.mockResolvedValue({
        nodes: [
          { id: a, code: 'KP_COMPLEX', name: 'Phức tạp', skill: 'READING', cefrLevel: 'C1' },
          { id: b, code: 'KP_SAME_LEVEL', name: 'Cùng cấp', skill: 'READING', cefrLevel: 'C1' },
          { id: c, code: 'KP_WORD', name: 'Từ trong ngữ cảnh', skill: 'READING', cefrLevel: 'B1' },
        ],
        edges: [{ from: c, to: b }, { from: b, to: a }],
      })
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      const dialog = await openChart()

      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_COMPLEX/ }))
      expect(within(dialog).getByText('3/40 đã chọn')).toBeInTheDocument()
      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_COMPLEX/ }))

      expect(within(dialog).getByText('0/40 đã chọn')).toBeInTheDocument()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_SAME_LEVEL/ })).not.toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_WORD/ })).not.toBeChecked()
    })

    it('ticks and unticks points from the chart, and a ticked goal brings what it needs', async () => {
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      const dialog = await openChart()
      expect(within(dialog).getByText('0/40 đã chọn')).toBeInTheDocument()

      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_PARAPHRASE/ }))
      expect(within(dialog).getByText('3/40 đã chọn')).toBeInTheDocument()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_READ_FOUNDATION/ })).toBeChecked()

      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_READ_FOUNDATION/ }))
      expect(within(dialog).getByRole('checkbox', { name: /^KP_READ_FOUNDATION/ })).not.toBeChecked()
      expect(within(dialog).getByText('2/40 đã chọn')).toBeInTheDocument()

      fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sơ đồ điểm kiến thức' })).not.toBeInTheDocument())
      expect(codes()).toEqual(['KP_PARAPHRASE', 'KP_READ_BASICS'])
    })

    it('takes with an unticked goal the prerequisites only it needed, and does not make a toast of it', async () => {
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      await pickParaphrase()
      const dialog = await openChart()

      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_PARAPHRASE/ }))

      expect(within(dialog).getByText('0/40 đã chọn')).toBeInTheDocument()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_READ_BASICS/ })).not.toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_READ_FOUNDATION/ })).not.toBeChecked()
      expect(screen.queryByText(/kiến thức tiên quyết/)).not.toBeInTheDocument()
    })

    it('keeps a prerequisite that another pick still needs when one goal is unticked', async () => {
      const current = await tree.fetchKnowledgeTree()
      const secondId = '88888888-8888-4888-8888-888888888888'
      tree.fetchKnowledgeTree.mockResolvedValue({
        nodes: [...current.nodes, { id: secondId, code: 'KP_SECOND', name: 'Mục tiêu thứ hai', skill: 'READING', cefrLevel: 'C1' }],
        edges: [...current.edges, { from: basicsId, to: secondId }],
      })
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      const dialog = await openChart()
      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_PARAPHRASE/ }))
      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_SECOND/ }))
      expect(within(dialog).getByText('4/40 đã chọn')).toBeInTheDocument()

      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_PARAPHRASE/ }))

      expect(within(dialog).getByText('3/40 đã chọn')).toBeInTheDocument()
      expect(within(dialog).getAllByRole('checkbox', { name: /^KP_READ_BASICS/ }).every((box) => (box as HTMLInputElement).checked)).toBe(true)
      expect(within(dialog).getByRole('checkbox', { name: /^KP_READ_FOUNDATION/ })).toBeChecked()
    })

    it('says so, and only then, when the limit leaves no room for all the prerequisites', async () => {
      function Harness() {
        const [picked, setPicked] = useState<string[]>([])
        return <CourseKnowledgePicker bandLevel={6.5} limit={2} onChange={setPicked} skills={['READING']} value={picked} />
      }
      render(<Harness />)
      fireEvent.click(await screen.findByRole('button', { name: 'Chọn điểm kiến thức' }))
      const dialog = await screen.findByRole('dialog', { name: 'Chọn điểm kiến thức' })
      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_PARAPHRASE/ }))

      // Room for one of the two: the nearest, KP_READ_BASICS, comes with the point; KP_READ_FOUNDATION cannot.
      expect(within(dialog).getByText(/^2\/2 đã chọn/)).toBeInTheDocument()
      expect(screen.getByText('Chưa thêm đủ kiến thức tiên quyết')).toBeInTheDocument()
      expect(screen.getByText('Còn 1 điểm chưa thêm vì đã đủ 2 điểm.')).toBeInTheDocument()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_READ_BASICS/ })).toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_READ_FOUNDATION/ })).not.toBeChecked()
    })

    it('ticks every point of the chart with "Chọn tất cả", the prerequisites below included', async () => {
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      const dialog = await openChart()

      fireEvent.click(within(dialog).getByRole('button', { name: 'Chọn tất cả' }))

      expect(within(dialog).getByText('3/40 đã chọn')).toBeInTheDocument()
      expect(within(dialog).getAllByRole('checkbox').every((box) => (box as HTMLInputElement).checked)).toBe(true)
      expect(within(dialog).getByRole('button', { name: 'Chọn tất cả' })).toBeDisabled()
    })

    it('shows points that are not picked yet, with the prerequisites a pick would bring, so the author sees how deep they go', async () => {
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      const dialog = await openChart()

      // Nothing is picked, yet the B1 point beneath the B2 one is already drawn.
      expect(within(dialog).getByRole('checkbox', { name: /^KP_READ_FOUNDATION/ })).not.toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_READ_BASICS/ })).not.toBeChecked()
    })

    it('sends exactly the points left picked, prerequisites first, and leaves adding them to the author', async () => {
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      await pickParaphrase()
      fireEvent.click(screen.getByRole('button', { name: 'Bỏ chọn KP_READ_FOUNDATION' }))
      submit()

      await waitFor(() => expect(api.requestCourseDraft).toHaveBeenCalledTimes(1))
      expect(api.requestCourseDraft).toHaveBeenCalledWith(expect.objectContaining({ knowledgePointIds: [basicsId, knowledgePointId], includePrerequisites: false }))
    })

    it('keeps the prerequisites on offer in the dialog, ticked or not, and does not add one back when it is unticked', async () => {
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      await pickParaphrase()

      const dialog = await openChooser()
      expect(within(dialog).getByRole('checkbox', { name: /^KP_READ_FOUNDATION/ })).toBeChecked()
      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_READ_FOUNDATION/ }))
      expect(within(dialog).getByRole('checkbox', { name: /^KP_READ_FOUNDATION/ })).not.toBeChecked()
      fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_READ_BASICS/ }))
      await closeChooser(dialog)

      expect(codes()).toEqual(['KP_PARAPHRASE'])
    })

    it('adds nothing for a point without prerequisites', async () => {
      const current = await tree.fetchKnowledgeTree()
      tree.fetchKnowledgeTree.mockResolvedValue({ ...current, edges: [] })
      render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
      await pickParaphrase()

      expect(codes()).toEqual(['KP_PARAPHRASE'])
      expect(screen.queryByText(/kiến thức tiên quyết/)).not.toBeInTheDocument()
    })
  })

  it('ticks everything listed with "Chọn tất cả", only what the filter shows, and is then switched off', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    const dialog = await openChooser()
    fireEvent.change(within(dialog).getByLabelText('Lọc điểm kiến thức'), { target: { value: 'PARAPHRASE' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chọn tất cả' }))
    expect(within(dialog).getByText('1/40 đã chọn')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Lọc điểm kiến thức'), { target: { value: '' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chọn tất cả' }))

    expect(within(dialog).getByText('2/40 đã chọn')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Chọn tất cả' })).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bỏ chọn tất cả' }))
    expect(within(dialog).getByText('0/40 đã chọn')).toBeInTheDocument()
  })

  it('offers only the picked skills, up to the band level, highest level first, without error traps', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    const dialog = await openChooser()
    const offered = within(dialog).getAllByRole('checkbox', { name: /KP_/ }).map((box) => box.closest('label')?.textContent ?? '')
    expect(offered).toHaveLength(2)
    expect(offered[0]).toContain('KP_PARAPHRASE')
    expect(offered[1]).toContain('KP_READ_BASICS')
    expect(within(dialog).queryByRole('checkbox', { name: /^KP_LISTEN_NUMBERS/ })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: /^KP_READ_ADVANCED/ })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: /^KP_READ_FOUNDATION/ })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: /TRAP_WRONG_PARAGRAPH/ })).not.toBeInTheDocument()
    expect(within(dialog).getByText(/cấp C1 và B2/)).toBeInTheDocument()
  })

  it('groups the dialog by level, filters by level and by text, and clears every pick at once', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    const dialog = await openChooser()
    expect(within(dialog).getByRole('region', { name: 'Cấp C1' })).toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'Cấp B2' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('region', { name: 'Cấp B1' })).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /^B2/ }))
    expect(within(dialog).queryByRole('checkbox', { name: /^KP_PARAPHRASE/ })).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /^Tất cả/ }))
    fireEvent.change(within(dialog).getByLabelText('Lọc điểm kiến thức'), { target: { value: 'basics' } })
    expect(within(dialog).getAllByRole('checkbox', { name: /KP_/ })).toHaveLength(1)
    fireEvent.change(within(dialog).getByLabelText('Lọc điểm kiến thức'), { target: { value: 'zzz' } })
    expect(within(dialog).getByText('Không có điểm kiến thức khớp bộ lọc.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Lọc điểm kiến thức'), { target: { value: '' } })
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_PARAPHRASE/ }))
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_READ_BASICS/ }))
    expect(within(dialog).getByText(/2\/40 đã chọn/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bỏ chọn tất cả' }))
    expect(within(dialog).getByText(/0\/40 đã chọn/)).toBeInTheDocument()
  })

  it('removes a picked point from its row, and starts the pick again when the band or the skills change', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    const dialog = await openChooser()
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_PARAPHRASE/ }))
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /^KP_READ_BASICS/ }))
    await closeChooser(dialog)
    const picks = screen.getByRole('table', { name: 'Điểm kiến thức đã chọn' })
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ chọn KP_PARAPHRASE' }))
    expect(within(picks).queryByText('KP_PARAPHRASE')).not.toBeInTheDocument()
    expect(within(picks).getByText('KP_READ_BASICS')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: '5.5' }))
    expect(within(picks).queryByText('KP_READ_BASICS')).not.toBeInTheDocument()
    expect(within(picks).getByText('Chưa chọn điểm kiến thức nào.')).toBeInTheDocument()

    const again = await openChooser()
    fireEvent.click(within(again).getByRole('checkbox', { name: /^KP_READ_BASICS/ }))
    await closeChooser(again)
    expect(within(picks).getByText('KP_READ_BASICS')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /^Nghe$/ }))
    expect(within(picks).queryByText('KP_READ_BASICS')).not.toBeInTheDocument()
    const last = await openChooser()
    expect(within(last).getByRole('checkbox', { name: /^KP_LISTEN_NUMBERS/ })).toBeInTheDocument()
  })

  it('keeps the picks when the band chosen again is the same one', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    await pickParaphrase()
    fireEvent.click(screen.getByRole('radio', { name: '6.5' }))
    expect(within(screen.getByRole('table', { name: 'Điểm kiến thức đã chọn' })).getByText('KP_PARAPHRASE')).toBeInTheDocument()
  })

  it('lists only the knowledge points of the band level, and nothing when the level has none', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    await screen.findByRole('button', { name: 'Chọn điểm kiến thức' })
    fireEvent.click(screen.getByRole('radio', { name: '8.0' }))
    const top = await openChooser()
    expect(within(top).getByRole('checkbox', { name: /^KP_READ_ADVANCED/ })).toBeInTheDocument()
    expect(within(top).getByRole('checkbox', { name: /^KP_PARAPHRASE/ })).toBeInTheDocument()
    expect(within(top).queryByRole('checkbox', { name: /^KP_READ_BASICS/ })).not.toBeInTheDocument()
    await closeChooser(top)
    fireEvent.click(screen.getByRole('radio', { name: '3.0' }))
    const bottom = await openChooser()
    expect(within(bottom).queryByRole('checkbox', { name: /^KP_PARAPHRASE/ })).not.toBeInTheDocument()
  })

  it('requires a knowledge point and at least one skill', async () => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    submit()
    expect(await screen.findByText(/Chọn ít nhất một điểm kiến thức/)).toBeInTheDocument()
    await pickParaphrase()
    fireEvent.click(screen.getByRole('checkbox', { name: /^Đọc$/ }))
    submit()
    expect(await screen.findByText(/Chọn ít nhất một kỹ năng/)).toBeInTheDocument()
    expect(api.requestCourseDraft).not.toHaveBeenCalled()
  })

  it.each(['0', '31'])('rejects invalid lesson count %s', async (count) => {
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    await pickParaphrase()
    fireEvent.change(screen.getByLabelText('Số bài học'), { target: { value: count } })
    submit()
    expect(await screen.findByText(/số nguyên từ 1 đến 30/)).toBeInTheDocument()
    expect(api.requestCourseDraft).not.toHaveBeenCalled()
  })

  it('locks the request while pending and keeps all fields after failure', async () => {
    let reject!: (reason: Error) => void
    api.requestCourseDraft.mockReturnValueOnce(new Promise((_resolve, rejectRequest) => { reject = rejectRequest }))
    render(<CourseGenerationForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    await pickParaphrase()
    fireEvent.change(screen.getByLabelText('Số bài học'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText(/Hướng dẫn thêm/), { target: { value: 'Ưu tiên bài ngắn' } })
    submit()
    expect(screen.getByRole('button', { name: 'Đang gửi yêu cầu…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled()
    expect(screen.getByLabelText('Số bài học')).toBeDisabled()
    submit()
    expect(api.requestCourseDraft).toHaveBeenCalledTimes(1)
    await act(async () => reject(new Error('Không kết nối được máy chủ')))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Số bài học')).toHaveValue(12)
    expect(within(screen.getByRole('table', { name: 'Điểm kiến thức đã chọn' })).getByText('KP_PARAPHRASE')).toBeInTheDocument()
    expect(screen.getByLabelText(/Hướng dẫn thêm/)).toHaveValue('Ưu tiên bài ngắn')
  })

  it('ignores late creation callbacks after the form unmounts', async () => {
    let resolve!: (value: CourseDraft) => void
    api.requestCourseDraft.mockReturnValueOnce(new Promise((resolveRequest) => { resolve = resolveRequest }))
    const onCreated = vi.fn()
    const { unmount } = render(<CourseGenerationForm onCreated={onCreated} onCancel={vi.fn()} />)
    await pickParaphrase()
    submit()
    unmount()
    await act(async () => resolve(draft))
    expect(onCreated).not.toHaveBeenCalled()
  })
})
