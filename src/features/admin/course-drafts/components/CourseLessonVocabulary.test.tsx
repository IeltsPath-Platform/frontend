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
function openDetail(word: string) {
  fireEvent.click(screen.getByRole('button', { name: `Xem chi tiết từ ${word}` }))
  return screen.getByRole('form', { name: 'Chi tiết từ vựng' })
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

    const table = screen.getByRole('table', { name: 'Từ vựng của bài' })
    expect(within(table).getByText('Động từ')).toBeTruthy()
    expect(within(table).getByRole('columnheader', { name: 'Câu ví dụ' })).toBeTruthy()
    expect(within(table).getByText('Prices fluctuate.')).toBeTruthy()
    expect(await within(table).findByText('Từ mới')).toBeTruthy()
    expect(within(table).getByText('Đã có: xu thế')).toBeTruthy()
    expect(library.findVocabularyByLemmas).toHaveBeenCalledWith(['fluctuate', 'trend'], expect.anything())
  })

  it('lists the senses picked from the library in the same table, marked as already in the library', async () => {
    senses.getLessonVocabularySenses.mockResolvedValue([{ senseId: trendSense, lemma: 'pollution', partOfSpeech: 'NOUN', vietnameseMeaning: 'sự ô nhiễm', exampleSentence: 'Air pollution is rising.' }])
    const { last } = show(lesson({ vocabularySenseIds: [trendSense], newVocabulary: [fluctuate] }))

    const table = screen.getByRole('table', { name: 'Từ vựng của bài' })
    const picked = (await within(table).findByText('pollution')).closest('tr') as HTMLElement
    expect(within(picked).getByText('Danh từ')).toBeTruthy()
    expect(within(picked).getByText('sự ô nhiễm')).toBeTruthy()
    expect(within(picked).getByText('Air pollution is rising.')).toBeTruthy()
    expect(within(picked).getByText('Đã có')).toBeTruthy()
    expect(within(picked).getByText('1')).toBeTruthy()
    expect((within(table).getByText('fluctuate').closest('tr') as HTMLElement).textContent).toContain('2')
    expect(screen.getByText('2/50')).toBeTruthy()

    fireEvent.click(within(picked).getByRole('button', { name: 'Bỏ từ pollution' }))
    expect(last().vocabularySenseIds).toEqual([])
  })

  it('searches the library in its own dialog and adds a sense to the lesson', async () => {
    library.searchVocabulary.mockResolvedValue([{ id: 'item', lemma: 'pollution', senses: [
      { id: trendSense, partOfSpeech: 'NOUN', status: 'ACTIVE', vietnameseMeaning: 'sự ô nhiễm', exampleSentence: 'Air pollution is rising.' },
      { id: '22222222-2222-4222-8222-222222222222', partOfSpeech: 'NOUN', status: 'INACTIVE', vietnameseMeaning: 'đã tắt' },
    ] }])
    const { last } = show(lesson({ newVocabulary: [fluctuate] }))
    expect(screen.queryByLabelText('Tìm từ vựng')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Chọn từ thư viện' }))
    const dialog = screen.getByRole('dialog', { name: 'Chọn từ thư viện' })
    expect(within(dialog).getByText('Tìm một từ để thêm nghĩa có sẵn của thư viện vào bài.')).toBeTruthy()
    fireEvent.change(within(dialog).getByLabelText('Tìm từ vựng'), { target: { value: ' poll ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tìm' }))

    const results = await within(dialog).findByRole('list', { name: 'Kết quả tìm từ vựng' })
    expect(library.searchVocabulary).toHaveBeenCalledWith('poll')
    expect(within(results).getAllByRole('listitem')).toHaveLength(1)
    expect(within(results).getByText('Air pollution is rising.')).toBeTruthy()
    fireEvent.click(within(results).getByRole('button', { name: 'Thêm pollution: sự ô nhiễm' }))

    expect(last().vocabularySenseIds).toEqual([trendSense])
    expect(within(results).getByText('Đã chọn')).toBeTruthy()
    expect(within(dialog).getByText('2/50 từ trong bài')).toBeTruthy()
  })

  it('tells the author when the library has no such word', async () => {
    show(lesson())
    fireEvent.click(screen.getByRole('button', { name: 'Chọn từ thư viện' }))
    const dialog = screen.getByRole('dialog', { name: 'Chọn từ thư viện' })
    fireEvent.change(within(dialog).getByLabelText('Tìm từ vựng'), { target: { value: 'zzz' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tìm' }))

    expect(await within(dialog).findByText('Không tìm thấy từ nào.')).toBeTruthy()
  })

  it('adds a word with the part of speech picked in one tap', () => {
    const { last } = show(lesson())
    fireEvent.click(screen.getByRole('button', { name: 'Thêm từ mới' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Thêm từ mới' }))
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

    const form = openDetail('trend')
    fireEvent.change(within(form).getByLabelText(/Nghĩa tiếng Việt/), { target: { value: 'khuynh hướng' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }))
    expect(last().newVocabulary?.map((word) => word.vietnameseMeaning)).toEqual(['dao động', 'khuynh hướng'])

    fireEvent.click(within(openDetail('fluctuate')).getByRole('button', { name: 'Gỡ từ này' }))
    expect(last().newVocabulary?.map((word) => word.lemma)).toEqual(['trend'])
  })

  it('lets the author adopt the sense the library already has instead of the proposal', async () => {
    library.findVocabularyByLemmas.mockResolvedValue([{ id: 'item', lemma: 'trend', senses: [{ id: trendSense, status: 'ACTIVE', vietnameseMeaning: 'xu thế' }] }])
    const { last } = show(lesson({ newVocabulary: [fluctuate, trend] }))
    await screen.findByText('Đã có: xu thế')

    const form = openDetail('trend')
    expect(within(form).getByText('xu thế')).toBeTruthy()
    fireEvent.click(within(form).getByRole('button', { name: 'Dùng nghĩa có sẵn' }))

    expect(last().vocabularySenseIds).toEqual([trendSense])
    expect(last().newVocabulary?.map((word) => word.lemma)).toEqual(['fluctuate'])
  })

  it('offers no adoption for a word the library lacks', async () => {
    show(lesson({ newVocabulary: [fluctuate] }))
    await screen.findByText('Từ mới')

    const form = openDetail('fluctuate')

    expect(within(form).queryByRole('button', { name: 'Dùng nghĩa có sẵn' })).toBeNull()
    expect(within(form).getByText(/chưa có trong thư viện/)).toBeTruthy()
    expect(within(form).getByRole('button', { name: 'Gỡ từ này' })).toBeTruthy()
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
    expect((screen.getByRole('button', { name: 'Thêm từ mới' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('does not change anything when the draft is read-only', async () => {
    show(lesson({ newVocabulary: [fluctuate] }), true)
    await waitFor(() => expect(library.findVocabularyByLemmas).toHaveBeenCalled())

    expect((screen.getByRole('button', { name: 'Thêm từ mới' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Chọn từ thư viện' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByLabelText('Tìm từ vựng')).toBeNull()
  })

  it('still opens the detail of a word when the draft is read-only, without a way to change it', async () => {
    const { onValue } = show(lesson({ newVocabulary: [fluctuate] }), true)
    await waitFor(() => expect(library.findVocabularyByLemmas).toHaveBeenCalled())

    const form = openDetail('fluctuate')

    expect((within(form).getByLabelText(/Câu ví dụ/) as HTMLTextAreaElement).value).toBe('Prices fluctuate.')
    expect((within(form).getByLabelText(/Câu ví dụ/) as HTMLTextAreaElement).disabled).toBe(true)
    expect(within(form).queryByRole('button', { name: 'Lưu' })).toBeNull()
    expect(within(form).queryByRole('button', { name: 'Gỡ từ này' })).toBeNull()
    expect(within(form).getByRole('button', { name: 'Đóng' })).toBeTruthy()
    expect(onValue).not.toHaveBeenCalled()
  })
})
