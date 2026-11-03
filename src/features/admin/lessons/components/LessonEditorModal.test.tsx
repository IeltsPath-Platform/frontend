import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import type { LessonEditor } from '../types'
import { LessonEditorModal } from './LessonEditorModal'

const { api, graph, questions, vocab } = vi.hoisted(() => ({
  api: {
    fetchLesson: vi.fn(), updateLesson: vi.fn(), setLessonKnowledgePoints: vi.fn(), addBlock: vi.fn(), updateBlock: vi.fn(),
    deleteBlock: vi.fn(), reorderBlocks: vi.fn(), publishLesson: vi.fn(), archiveLesson: vi.fn(), searchVocabulary: vi.fn(),
    fetchLessonResources: vi.fn(), createLessonResource: vi.fn(), updateLessonResource: vi.fn(), deleteLessonResource: vi.fn(),
  },
  graph: { fetchKnowledgeTree: vi.fn() },
  questions: { listQuestions: vi.fn(), getQuestion: vi.fn() },
  vocab: { getLessonVocabularySenses: vi.fn() },
}))
vi.mock('../api/lessonApi', () => api)
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => graph)
vi.mock('../../questions/api/questionApi', () => questions)
vi.mock('@/features/learning-path/api/lessonVocabularyApi', () => vocab)

function lesson(overrides: Partial<LessonEditor> = {}): LessonEditor {
  return {
    id: 'l1', topicId: 't1', code: 'L1', title: 'Skimming', summary: 'Tóm tắt', summaryMarkdown: '', sortOrder: 1,
    status: 'DRAFT', estimatedMinutes: 10, knowledgePointIds: ['kp1'], knowledgePoints: [],
    blocks: [
      { id: 'b1', blockType: 'TEXT', sortOrder: 1, textContent: 'Intro text', assetId: null, vocabularySenseIds: [], knowledgePointIds: [], questions: [] },
      { id: 'b2', blockType: 'EXERCISE', sortOrder: 2, textContent: null, assetId: null, vocabularySenseIds: [], knowledgePointIds: [],
        questions: [{ questionVersionId: 'v1', stem: 'Pick one', status: 'PUBLISHED' }] },
    ],
    ...overrides,
  }
}

function renderPage(onClose = vi.fn()) {
  render(<LessonEditorModal fallbackTitle="Bài đang mở" lessonId="l1" onClose={onClose} topicName="Reading" />)
  return onClose
}

describe('LessonEditorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchLesson.mockResolvedValue(lesson())
    api.fetchLessonResources.mockResolvedValue({ lessonId: 'l1', summaryMarkdown: null, slides: [], documents: [] })
    graph.fetchKnowledgeTree.mockResolvedValue({ nodes: [{ id: 'kp1', code: 'R55_SCAN', name: 'Scanning', kind: 'STRATEGY', status: 'ACTIVE' }], edges: [] })
    questions.listQuestions.mockResolvedValue({ content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 })
    vocab.getLessonVocabularySenses.mockResolvedValue([])
  })

  it('shows the status beside the title in the header, not in the body, and carries no publish or archive button', async () => {
    renderPage()

    const popup = await screen.findByRole('dialog', { name: 'Skimming' })
    const header = popup.querySelector('.adm-modal__header') as HTMLElement
    expect(within(header).getByText('Nháp')).toBeInTheDocument()
    expect(within(header).getByText('L1 · Reading')).toBeInTheDocument()
    expect(popup.querySelector('.adm-modal__body')).not.toHaveTextContent('Nháp')
    expect(screen.queryByRole('button', { name: /Xuất bản|Lưu trữ/ })).not.toBeInTheDocument()
  })

  it('shows the blocks in order with the lesson status', async () => {
    renderPage()

    expect(await screen.findByRole('form', { name: 'Thông tin bài học' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Skimming')
    expect(screen.queryByLabelText('Tóm tắt')).not.toBeInTheDocument()
    expect(screen.getByText('Nháp')).toBeInTheDocument()
    expect(screen.getByText('Intro text')).toBeInTheDocument()
    expect(screen.getByText('1 câu hỏi')).toBeInTheDocument()
  })

  it('chooses the knowledge points of the lesson in a picker and saves them from its section', async () => {
    graph.fetchKnowledgeTree.mockResolvedValue({
      nodes: [
        { id: 'kp1', code: 'R55_SCAN', name: 'Scanning', kind: 'STRATEGY', status: 'ACTIVE' },
        { id: 'kp2', code: 'R55_SKIM', name: 'Skimming', kind: 'STRATEGY', status: 'ACTIVE', cefrLevel: 'B1' },
      ],
      edges: [],
    })
    api.setLessonKnowledgePoints.mockResolvedValue(undefined)
    renderPage()

    const section = await screen.findByRole('region', { name: 'Knowledge point của bài' })
    expect(await within(section).findByRole('table', { name: 'Knowledge point của bài' })).toHaveTextContent('R55_SCAN')
    fireEvent.click(within(section).getByRole('button', { name: 'Sửa lựa chọn' }))

    const picker = await screen.findByRole('dialog', { name: 'Chọn điểm kiến thức' })
    expect(within(picker).getByRole('region', { name: 'Cấp B1' })).toHaveTextContent('R55_SKIM')
    expect(within(picker).getByRole('region', { name: 'Chưa xếp cấp' })).toHaveTextContent('R55_SCAN')
    fireEvent.click(within(picker).getByRole('checkbox', { name: /R55_SKIM/ }))
    fireEvent.click(within(picker).getByRole('button', { name: 'Lưu' }))

    fireEvent.click(within(section).getByRole('button', { name: 'Lưu KP' }))
    await waitFor(() => expect(api.setLessonKnowledgePoints).toHaveBeenCalledWith('l1', ['kp1', 'kp2']))
  })

  it('removes a knowledge point from the table with its cross', async () => {
    renderPage()
    const section = await screen.findByRole('region', { name: 'Knowledge point của bài' })
    fireEvent.click(await within(section).findByRole('button', { name: 'Bỏ R55_SCAN' }))
    expect(within(section).getByText('Chưa gắn điểm kiến thức nào.')).toBeInTheDocument()
    expect(within(section).getByText('0/50')).toBeInTheDocument()
  })

  it('moves a block down and reloads the lesson', async () => {
    api.reorderBlocks.mockResolvedValue(undefined)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Đưa block 1 xuống' }))

    await waitFor(() => expect(api.reorderBlocks).toHaveBeenCalledWith('l1', ['b2', 'b1']))
    await waitFor(() => expect(api.fetchLesson).toHaveBeenCalledTimes(2))
  })

  it('edits a text block under its own id', async () => {
    api.updateBlock.mockResolvedValue(undefined)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa block 1' }))

    const form = await screen.findByRole('form', { name: /Sửa block/ })
    fireEvent.change(within(form).getByLabelText('Nội dung (Markdown)'), { target: { value: 'New text' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.updateBlock).toHaveBeenCalledWith('l1', 'b1', { blockType: 'TEXT', textContent: 'New text', knowledgePointIds: [] }))
  })

  it('does not send an empty text block', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Bài giảng (văn bản)' }))

    const form = await screen.findByRole('form', { name: /Thêm block/ })
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Cần nhập nội dung bài giảng.')).toBeInTheDocument()
    expect(api.addBlock).not.toHaveBeenCalled()
  })

  it('locks exercise blocks once the lesson is published but keeps the others editable', async () => {
    api.fetchLesson.mockResolvedValue(lesson({ status: 'PUBLISHED' }))
    renderPage()

    expect(await screen.findByRole('note')).toHaveTextContent('Bài đã xuất bản')
    expect(screen.getByRole('button', { name: 'Sửa block 1' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Sửa block 2' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Xóa block 2' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bài tập' })).toBeDisabled()
  })

  it('shows a load error with a retry', async () => {
    api.fetchLesson.mockRejectedValueOnce(new HttpError(404, 'Không tìm thấy bài học'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy bài học')
    api.fetchLesson.mockResolvedValue(lesson())
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByLabelText('Tiêu đề')).toHaveValue('Skimming')
  })

  it('keeps lesson information editable when resources cannot load', async () => {
    api.fetchLessonResources.mockRejectedValue(new HttpError(503, 'Không tải được tài nguyên'))
    renderPage()
    expect(await screen.findByText('Không tải được tài nguyên')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Thông tin bài học' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu thông tin' })).toBeEnabled()
  })
})
