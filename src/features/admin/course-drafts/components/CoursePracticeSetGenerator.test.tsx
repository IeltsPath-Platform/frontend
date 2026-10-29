import { act, fireEvent, render, screen, within } from '@/test/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PracticeSetDraft } from '../../ai-drafts/types'
import { CoursePracticeSetGenerator } from './CoursePracticeSetGenerator'

const api = vi.hoisted(() => ({ requestPracticeSetDraft: vi.fn(), getPracticeSetDraft: vi.fn() }))
vi.mock('../../ai-drafts/api/aiDraftApi', () => api)
const vocabularyApi = vi.hoisted(() => ({ getLessonVocabularySenses: vi.fn() }))
vi.mock('@/features/learning-path/api/lessonVocabularyApi', () => vocabularyApi)

const first = '11111111-1111-4111-8111-111111111111'
const second = '22222222-2222-4222-8222-222222222222'
const draftId = '33333333-3333-4333-8333-333333333333'
const points = [{ id: first, code: 'DR_TOPIC_SENTENCE', name: 'Câu chủ đề' }, { id: second, code: 'TR_R_WORD_IN_CONTEXT', name: 'Đoán nghĩa từ theo ngữ cảnh' }]

const draft = (status: string, extra: Partial<PracticeSetDraft> = {}): PracticeSetDraft => ({
  id: draftId, kind: 'PRACTICE_SET', status, request: {}, result: null, errorCode: null, model: null, promptVersion: null,
  createdAt: '2026-10-28T10:00:00Z', finishedAt: null, reviewedAt: null, reviewNote: null, ...extra,
}) as PracticeSetDraft

const item = (stem: string) => ({
  stem, options: [{ optionKey: 'A', content: 'x', sortOrder: 1 }, { optionKey: 'B', content: 'y', sortOrder: 2 }],
  answerSpec: { type: 'CHOICE' as const, correct: 'B' }, explanation: 'Because.', difficulty: 'MEDIUM' as const,
})
const readyDraft = () => draft('READY', {
  result: { title: ' Topic sentences ', instructions: 'Read.', passage: 'A. Text.', questionType: 'MULTIPLE_CHOICE', knowledgePointIds: [first],
    items: [item('Q1'), item('Q2'), item('Q3')], rejected: [] },
})

const senseId = '44444444-4444-4444-8444-444444444444'

function open(onGenerated = vi.fn(), onClose = vi.fn()) {
  render(<CoursePracticeSetGenerator lessonTitle="Bài 1" newWordLemmas={[' Infer ', 'topic']} onClose={onClose} onGenerated={onGenerated}
    points={points} vocabularySenseIds={[senseId]} />)
  return { onGenerated, onClose }
}

describe('CoursePracticeSetGenerator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    api.requestPracticeSetDraft.mockResolvedValue(draft('QUEUED'))
    vocabularyApi.getLessonVocabularySenses.mockResolvedValue([{ senseId, lemma: 'Topic' }, { senseId: 'x', lemma: 'context' }])
  })
  afterEach(() => vi.useRealTimers())

  it('asks for the points, the type, the count and the difficulty it was given', async () => {
    open()
    fireEvent.click(within(screen.getByRole('group', { name: /Điểm kiến thức/ })).getByRole('checkbox', { name: /Đoán nghĩa từ theo ngữ cảnh/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'True / False / Not Given' }))
    fireEvent.change(screen.getByLabelText('Số câu'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Độ khó'), { target: { value: 'HARD' } })

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tạo gói' })) })

    expect(api.requestPracticeSetDraft).toHaveBeenCalledWith({
      knowledgePointIds: [first], lessonTitle: 'Bài 1', vocabulary: ['Topic', 'context', 'Infer'],
      questionType: 'TRUE_FALSE_NOT_GIVEN', count: 7, difficulty: 'HARD',
    })
    expect(screen.getByText(/AI đang viết gói luyện/)).toBeTruthy()
  })

  it('sends the words of the lesson, from the library and the proposed ones, so the passage uses them', async () => {
    open()

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tạo gói' })) })

    expect(vocabularyApi.getLessonVocabularySenses).toHaveBeenCalledWith([senseId])
    expect(api.requestPracticeSetDraft.mock.calls[0]![0].vocabulary).toEqual(['Topic', 'context', 'Infer'])
  })

  it('keeps the points the model named for each question', async () => {
    api.getPracticeSetDraft.mockResolvedValue(draft('READY', {
      result: { title: 'T', instructions: '', passage: 'A. Text.', questionType: 'MULTIPLE_CHOICE', knowledgePointIds: [first, second],
        items: [{ ...item('Q1'), knowledgePointIds: [second] }, item('Q2'), item('Q3')], rejected: [] },
    }))
    const { onGenerated } = open()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tạo gói' })) })

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    const questions = onGenerated.mock.calls[0]![0].questions
    expect(questions[0].knowledgePointIds).toEqual([second])
    expect(questions[1].knowledgePointIds).toBeUndefined()
  })

  it('waits, asks again every few seconds and hands over the set when the draft is ready', async () => {
    api.getPracticeSetDraft.mockResolvedValueOnce(draft('GENERATING')).mockResolvedValue(readyDraft())
    const { onGenerated, onClose } = open()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tạo gói' })) })

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(onGenerated).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(api.getPracticeSetDraft).toHaveBeenCalledWith(draftId)
    expect(onGenerated).toHaveBeenCalledTimes(1)
    expect(onGenerated.mock.calls[0]![0]).toMatchObject({
      title: 'Topic sentences', instructions: 'Read.', passage: 'A. Text.', questionType: 'MULTIPLE_CHOICE', knowledgePointIds: [first],
      questions: [{ stem: 'Q1', correctKey: 'B', explanation: 'Because.', difficulty: 'MEDIUM', options: [{ optionKey: 'A', content: 'x' }, { optionKey: 'B', content: 'y' }] }, {}, {}],
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('says the allowance came back when the model failed, and lets the author try again', async () => {
    api.getPracticeSetDraft.mockResolvedValue(draft('FAILED', { errorCode: 'INVALID_REPLY' }))
    const { onGenerated } = open()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tạo gói' })) })

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(screen.getByRole('alert').textContent).toContain('AI trả về nội dung chưa dùng được.')
    expect(screen.getByRole('alert').textContent).toContain('Lượt dùng đã được hoàn lại')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(screen.getByRole('button', { name: 'Tạo gói' })).toBeTruthy()
    expect(onGenerated).not.toHaveBeenCalled()
  })

  it('refuses to ask without a knowledge point', async () => {
    open()
    for (const box of within(screen.getByRole('group', { name: /Điểm kiến thức/ })).getAllByRole('checkbox')) fireEvent.click(box)

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tạo gói' })) })

    expect(api.requestPracticeSetDraft).not.toHaveBeenCalled()
    expect(screen.getByText('Chọn ít nhất một điểm kiến thức.')).toBeTruthy()
  })
})
