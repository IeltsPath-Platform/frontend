import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { answerConfirm } from '@/test/confirm'
import type { VocabularySenseCard } from '@/features/learning-path/api/lessonVocabularyApi'
import type { LessonEditor } from '../types'
import { LessonEditorModal } from './LessonEditorModal'

const { api, graph, questions, vocab } = vi.hoisted(() => ({
  api: {
    fetchLesson: vi.fn(), updateLesson: vi.fn(), setLessonKnowledgePoints: vi.fn(), addBlock: vi.fn(), updateBlock: vi.fn(),
    deleteBlock: vi.fn(), reorderBlocks: vi.fn(), publishLesson: vi.fn(), archiveLesson: vi.fn(), searchVocabulary: vi.fn(), suggestVocabulary: vi.fn(),
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
    api.suggestVocabulary.mockResolvedValue({ content: [], page: 0, size: 20, hasMore: false })
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

  it('chooses the knowledge points of the lesson in a picker and saves them with the lesson information', async () => {
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

    // The picker's own Lưu only confirms the choice; nothing is sent until the one Lưu of the form.
    expect(api.setLessonKnowledgePoints).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }))
    await waitFor(() => expect(api.setLessonKnowledgePoints).toHaveBeenCalledWith('l1', ['kp1', 'kp2']))
    expect(api.updateLesson).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Lưu KP' })).not.toBeInTheDocument()
  })

  it('removes a knowledge point from the table with its cross', async () => {
    renderPage()
    const section = await screen.findByRole('region', { name: 'Knowledge point của bài' })
    fireEvent.click(await within(section).findByRole('button', { name: 'Bỏ R55_SCAN' }))
    expect(within(section).getByText('Chưa gắn điểm kiến thức nào.')).toBeInTheDocument()
    expect(within(section).getByText('0/50')).toBeInTheDocument()
  })

  describe('vocabulary block as a table', () => {
    const sense = (senseId: string, lemma: string, partOfSpeech: string, vietnameseMeaning: string): VocabularySenseCard => ({
      senseId, vocabularyItemId: `w-${senseId}`, lemma, ipa: null, pronunciationAudioReference: null, partOfSpeech,
      englishDefinition: null, vietnameseMeaning, exampleSentence: null, imageUrl: null,
    })
    const senses: Record<string, VocabularySenseCard> = {
      s1: sense('s1', 'climate', 'noun', 'khí hậu'),
      s2: sense('s2', 'weather', 'noun', 'thời tiết'),
      s3: sense('s3', 'humid', 'adjective', 'ẩm ướt'),
    }
    function vocabularyLesson(ids: string[]) {
      return lesson({ blocks: [{ id: 'v1', blockType: 'VOCABULARY', sortOrder: 1, textContent: null, assetId: null, vocabularySenseIds: ids, knowledgePointIds: [], questions: [] }] })
    }

    beforeEach(() => {
      vocab.getLessonVocabularySenses.mockImplementation(async (ids: string[]) => ids.map((id) => senses[id]).filter((card): card is VocabularySenseCard => Boolean(card)))
      api.updateBlock.mockResolvedValue(undefined)
    })

    it('lists each word of the block as a row with its part of speech and meaning', async () => {
      api.fetchLesson.mockResolvedValue(vocabularyLesson(['s1', 's2']))
      renderPage()
      const section = await screen.findByRole('region', { name: 'Từ vựng của block 1' })
      const table = await within(section).findByRole('table', { name: 'Từ vựng' })
      expect(within(table).getAllByRole('row')).toHaveLength(3)
      expect(within(table).getByText('climate')).toBeInTheDocument()
      expect(within(table).getByText('thời tiết')).toBeInTheDocument()
      expect(within(table).getAllByText('noun')).toHaveLength(2)
    })

    it('removes one word after confirmation and keeps the others', async () => {
      api.fetchLesson.mockResolvedValue(vocabularyLesson(['s1', 's2']))
      renderPage()
      const section = await screen.findByRole('region', { name: 'Từ vựng của block 1' })
      fireEvent.click(await within(section).findByRole('button', { name: 'Hành động của từ 1' }))
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Bỏ khỏi block' }))
      await answerConfirm(true)
      await waitFor(() => expect(api.updateBlock).toHaveBeenCalledWith('l1', 'v1', { blockType: 'VOCABULARY', vocabularySenseIds: ['s2'] }))
    })

    it('does not let the last word of a block be removed', async () => {
      api.fetchLesson.mockResolvedValue(vocabularyLesson(['s1']))
      renderPage()
      const section = await screen.findByRole('region', { name: 'Từ vựng của block 1' })
      fireEvent.click(await within(section).findByRole('button', { name: 'Hành động của từ 1' }))
      expect(await screen.findByRole('menuitem', { name: 'Bỏ khỏi block' })).toBeDisabled()
    })

    it('adds a word found in the search, and saves the block only with the popup\'s Lưu', async () => {
      api.fetchLesson.mockResolvedValue(vocabularyLesson(['s1']))
      api.suggestVocabulary.mockResolvedValue({ content: [{ id: 'w3', lemma: 'humid', ipa: null, status: 'ACTIVE', senses: [{ id: 's3', partOfSpeech: 'adjective', vietnameseMeaning: 'ẩm ướt', englishDefinition: null, status: 'ACTIVE' }] }], page: 0, size: 20, hasMore: false })
      renderPage()
      const section = await screen.findByRole('region', { name: 'Từ vựng của block 1' })
      fireEvent.click(within(section).getByRole('button', { name: 'Thêm từ vựng' }))
      const popup = await screen.findByRole('dialog', { name: 'Thêm từ vựng' })
      fireEvent.change(within(popup).getByLabelText('Tìm từ vựng'), { target: { value: 'humid' } })
      fireEvent.submit(within(popup).getByLabelText('Tìm từ vựng').closest('form') as HTMLFormElement)
      fireEvent.click(await within(popup).findByRole('button', { name: 'Thêm' }))
      expect(api.updateBlock).not.toHaveBeenCalled()

      fireEvent.click(within(popup).getByRole('button', { name: 'Lưu từ vựng' }))
      await waitFor(() => expect(api.updateBlock).toHaveBeenCalledWith('l1', 'v1', { blockType: 'VOCABULARY', vocabularySenseIds: ['s1', 's3'] }))
    })
  })

  it('has a single Lưu, in the button bar at the foot of the popup, next to a Đóng that closes it', async () => {
    const onClose = renderPage()
    const popup = await screen.findByRole('dialog', { name: 'Skimming' })
    await screen.findByRole('form', { name: 'Thông tin bài học' })

    const bar = popup.querySelector('.adm-modal__body > .adm-course-draft-lesson > .adm-form-footer') as HTMLElement
    expect(bar).not.toBeNull()
    expect(within(popup).getAllByRole('button', { name: /^Lưu/ })).toHaveLength(1)
    expect(within(bar).getByRole('button', { name: 'Lưu thông tin' })).toHaveAttribute('form', screen.getByRole('form', { name: 'Thông tin bài học' }).id)

    fireEvent.click(within(bar).getByRole('button', { name: 'Đóng' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('saves only the lesson information, and reloads, when the knowledge points were not changed', async () => {
    api.updateLesson.mockResolvedValue(undefined)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu thông tin' }))

    await waitFor(() => expect(api.updateLesson).toHaveBeenCalledTimes(1))
    expect(api.setLessonKnowledgePoints).not.toHaveBeenCalled()
    await waitFor(() => expect(api.fetchLesson).toHaveBeenCalledTimes(2))
  })

  it('says the information was saved when only the knowledge points fail, and keeps the choice on screen', async () => {
    api.updateLesson.mockResolvedValue(undefined)
    api.setLessonKnowledgePoints.mockRejectedValue(new HttpError(503, 'Kho điểm kiến thức tạm thời không dùng được'))
    renderPage()
    const section = await screen.findByRole('region', { name: 'Knowledge point của bài' })
    fireEvent.click(await within(section).findByRole('button', { name: 'Bỏ R55_SCAN' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }))

    expect(await screen.findByText(/Đã lưu thông tin bài, chưa lưu được điểm kiến thức/)).toBeInTheDocument()
    expect(api.updateLesson).toHaveBeenCalledTimes(1)
    // No reload: it would put the points the author just removed back.
    expect(api.fetchLesson).toHaveBeenCalledTimes(1)
    expect(within(section).getByText('Chưa gắn điểm kiến thức nào.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu thông tin' })).toBeEnabled()
  })

  it('sends nothing for the knowledge points when the lesson information is refused', async () => {
    api.updateLesson.mockRejectedValue(new HttpError(409, 'Bài đã đổi'))
    renderPage()
    const section = await screen.findByRole('region', { name: 'Knowledge point của bài' })
    fireEvent.click(await within(section).findByRole('button', { name: 'Bỏ R55_SCAN' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }))

    await waitFor(() => expect(api.updateLesson).toHaveBeenCalledTimes(1))
    expect(api.setLessonKnowledgePoints).not.toHaveBeenCalled()
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
