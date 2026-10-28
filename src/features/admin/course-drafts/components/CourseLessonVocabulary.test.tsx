import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CourseLesson } from '../types'
import { CourseLessonVocabulary } from './CourseLessonVocabulary'

const library = vi.hoisted(() => ({ findVocabularyByLemmas: vi.fn(), searchVocabulary: vi.fn() }))
const senses = vi.hoisted(() => ({ getLessonVocabularySenses: vi.fn() }))
vi.mock('../../lessons/api/lessonApi', () => library)
vi.mock('@/features/learning-path/api/lessonVocabularyApi', () => senses)

const trendSense = '11111111-1111-4111-8111-111111111111'
const fluctuate = { lemma: 'fluctuate', ipa: null, partOfSpeech: 'VERB' as const, englishDefinition: 'to vary', vietnameseMeaning: 'dao động', exampleSentence: 'Prices fluctuate.' }
const trend = { lemma: 'trend', ipa: '/trend/', partOfSpeech: 'NOUN' as const, englishDefinition: null, vietnameseMeaning: 'xu hướng', exampleSentence: 'An upward trend.' }
const lesson = (patch: Partial<CourseLesson> = {}): CourseLesson => ({
  code: 'L1', title: 'Bài một', summary: '', knowledgePointIds: [], blocks: [], practiceSetPackageIds: [], ...patch,
})

/** Keeps the lesson in state like the editor above it, and reports every value it takes. */
function Harness({ start, onValue, disabled = false }: { start: CourseLesson; onValue: (next: CourseLesson) => void; disabled?: boolean }) {
  const [value, setValue] = useState(start)
  return <CourseLessonVocabulary disabled={disabled} onChange={(next) => { setValue(next); onValue(next) }} value={value} />
}
function show(start: CourseLesson, disabled = false) {
  const onValue = vi.fn()
  render(<Harness disabled={disabled} onValue={onValue} start={start} />)
  return { onValue, last: () => onValue.mock.lastCall![0] as CourseLesson }
}
function chooseFromRowMenu(word: string, action: string) {
  fireEvent.click(screen.getByRole('button', { name: `Hành động của từ ${word}` }))
  fireEvent.click(screen.getByRole('menuitem', { name: `${action} ${word}` }))
}

describe('CourseLessonVocabulary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    library.findVocabularyByLemmas.mockResolvedValue([])
    library.searchVocabulary.mockResolvedValue([])
    senses.getLessonVocabularySenses.mockResolvedValue([])
  })

  it('lists the proposed words and marks the ones the library already has', async () => {
    library.findVocabularyByLemmas.mockResolvedValue([{ id: 'item', lemma: 'Trend', senses: [{ id: trendSense, status: 'ACTIVE', vietnameseMeaning: 'xu thế' }] }])
    show(lesson({ newVocabulary: [fluctuate, trend] }))

    const table = screen.getByRole('table', { name: 'Từ vựng đề xuất của bài' })
    expect(within(table).getByText('Động từ')).toBeTruthy()
    expect(await within(table).findByText('Từ mới')).toBeTruthy()
    expect(within(table).getByText('Đã có: xu thế')).toBeTruthy()
    expect(library.findVocabularyByLemmas).toHaveBeenCalledWith(['fluctuate', 'trend'], expect.anything())
  })

  it('adds a word with the part of speech picked in one tap', () => {
    const { last } = show(lesson())
    fireEvent.click(screen.getByRole('button', { name: 'Thêm từ' }))
    const form = screen.getByRole('form', { name: 'Thêm từ vựng' })
    fireEvent.change(within(form).getByLabelText(/Từ vựng/), { target: { value: ' plummet ' } })
    fireEvent.click(within(form).getByRole('radio', { name: 'Động từ' }))
    fireEvent.change(within(form).getByLabelText(/Nghĩa tiếng Việt/), { target: { value: 'giảm mạnh' } })
    fireEvent.change(within(form).getByLabelText(/Câu ví dụ/), { target: { value: 'Sales plummeted.' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }))

    expect(last().newVocabulary).toEqual([{ lemma: 'plummet', ipa: null, partOfSpeech: 'VERB', englishDefinition: null, vietnameseMeaning: 'giảm mạnh', exampleSentence: 'Sales plummeted.' }])
  })

  it('refuses a word without a meaning, an example, or one the lesson already has', () => {
    const { onValue } = show(lesson({ newVocabulary: [trend] }))
    fireEvent.click(screen.getByRole('button', { name: 'Thêm từ' }))
    const form = screen.getByRole('form', { name: 'Thêm từ vựng' })
    fireEvent.change(within(form).getByLabelText(/Từ vựng/), { target: { value: 'Trend' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }))
    expect(screen.getByText('Nhập nghĩa tiếng Việt.')).toBeInTheDocument()

    fireEvent.change(within(form).getByLabelText(/Nghĩa tiếng Việt/), { target: { value: 'xu hướng' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }))
    expect(screen.getByText('Nhập câu ví dụ.')).toBeInTheDocument()

    fireEvent.change(within(form).getByLabelText(/Câu ví dụ/), { target: { value: 'x' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }))
    expect(screen.getByText('Từ này đã có trong bài.')).toBeInTheDocument()
    expect(onValue).not.toHaveBeenCalled()
  })

  it('edits a word in place and removes another', () => {
    const { last } = show(lesson({ newVocabulary: [fluctuate, trend] }))

    chooseFromRowMenu('trend', 'Sửa từ')
    const form = screen.getByRole('form', { name: 'Sửa từ vựng' })
    fireEvent.change(within(form).getByLabelText(/Nghĩa tiếng Việt/), { target: { value: 'khuynh hướng' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }))
    expect(last().newVocabulary?.map((word) => word.vietnameseMeaning)).toEqual(['dao động', 'khuynh hướng'])

    chooseFromRowMenu('fluctuate', 'Gỡ từ')
    expect(last().newVocabulary?.map((word) => word.lemma)).toEqual(['trend'])
  })

  it('lets the author adopt the sense the library already has instead of the proposal', async () => {
    library.findVocabularyByLemmas.mockResolvedValue([{ id: 'item', lemma: 'trend', senses: [{ id: trendSense, status: 'ACTIVE', vietnameseMeaning: 'xu thế' }] }])
    const { last } = show(lesson({ newVocabulary: [fluctuate, trend] }))
    await screen.findByText('Đã có: xu thế')

    chooseFromRowMenu('trend', 'Dùng nghĩa có sẵn của từ')

    expect(last().vocabularySenseIds).toEqual([trendSense])
    expect(last().newVocabulary?.map((word) => word.lemma)).toEqual(['fluctuate'])
  })

  it('offers no adoption for a word the library lacks', async () => {
    show(lesson({ newVocabulary: [fluctuate] }))
    await screen.findByText('Từ mới')

    fireEvent.click(screen.getByRole('button', { name: 'Hành động của từ fluctuate' }))

    expect(screen.queryByRole('menuitem', { name: 'Dùng nghĩa có sẵn của từ fluctuate' })).toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Sửa từ fluctuate' })).toBeTruthy()
  })

  it('still lists the words when the library cannot be checked', async () => {
    library.findVocabularyByLemmas.mockRejectedValue(new Error('down'))
    show(lesson({ newVocabulary: [fluctuate] }))

    expect(await screen.findByText('Chưa kiểm tra được')).toBeTruthy()
    expect(screen.getByText('fluctuate')).toBeTruthy()
  })

  it('counts picked senses and proposed words together and stops at the limit', () => {
    show(lesson({ vocabularySenseIds: Array.from({ length: 30 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`), newVocabulary: Array.from({ length: 20 }, (_, index) => ({ ...fluctuate, lemma: `word${String.fromCharCode(97 + index)}` })) }))

    expect(screen.getByText('50/50')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Thêm từ' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('does not change anything when the draft is read-only', async () => {
    show(lesson({ newVocabulary: [fluctuate] }), true)
    await waitFor(() => expect(library.findVocabularyByLemmas).toHaveBeenCalled())

    expect((screen.getByRole('button', { name: 'Thêm từ' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByLabelText('Tìm từ vựng')).toBeNull()
  })
})
