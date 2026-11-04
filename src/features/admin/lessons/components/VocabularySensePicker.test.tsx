import { act, cleanup, fireEvent, render, screen } from '@/test/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VocabularyHit, VocabularySuggestionsPage } from '../api/lessonApi'
import { VocabularySensePicker } from './VocabularySensePicker'

const api = vi.hoisted(() => ({
  searchVocabulary: vi.fn<(query: string, page: number, signal?: AbortSignal) => Promise<VocabularySuggestionsPage>>(),
  getLessonVocabularySenses: vi.fn(),
}))
vi.mock('../api/lessonApi', () => ({ suggestVocabulary: api.searchVocabulary }))
vi.mock('@/features/learning-path/api/lessonVocabularyApi', () => ({ getLessonVocabularySenses: api.getLessonVocabularySenses }))

const word = (lemma: string): VocabularyHit => ({
  id: lemma, lemma, senses: [{ id: `${lemma}-sense`, partOfSpeech: 'NOUN', vietnameseMeaning: 'Nghĩa tiếng Việt', status: 'ACTIVE' }],
})
const page = (lemma: string, number = 0, hasMore = false): VocabularySuggestionsPage => ({ content: [word(lemma)], page: number, size: 20, hasMore })
const advance = async (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

describe('VocabularySensePicker search', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    api.getLessonVocabularySenses.mockResolvedValue([])
    api.searchVocabulary.mockResolvedValue(page('climate'))
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('suggests words after typing stops and clears results when the input is cleared', async () => {
    render(<VocabularySensePicker onChange={vi.fn()} value={[]} />)
    const input = screen.getByLabelText('Tìm từ vựng')
    fireEvent.change(input, { target: { value: 'cl' } })
    await advance(299)
    expect(api.searchVocabulary).not.toHaveBeenCalled()
    expect(screen.queryByText('Đang tìm từ vựng…')).not.toBeInTheDocument()
    fireEvent.change(input, { target: { value: ' climate ' } })
    await advance(299)
    expect(api.searchVocabulary).not.toHaveBeenCalled()
    await advance(1)
    expect(api.searchVocabulary).toHaveBeenCalledExactlyOnceWith('climate', 0, expect.any(AbortSignal))
    expect(screen.getByText('climate')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '' } })
    expect(screen.queryByText('climate')).not.toBeInTheDocument()
    await advance(300)
    expect(api.searchVocabulary).toHaveBeenCalledTimes(1)
  })

  it('searches immediately on submit without a second request when the debounce expires', async () => {
    const onChange = vi.fn()
    render(<VocabularySensePicker onChange={onChange} value={[]} />)
    const input = screen.getByLabelText('Tìm từ vựng')
    fireEvent.compositionStart(input)
    fireEvent.input(input, { target: { value: 'climate' }, isComposing: true })
    fireEvent.submit(input.closest('form')!)
    await advance(0)
    expect(screen.getByText('climate')).toBeInTheDocument()
    await advance(300)
    expect(api.searchVocabulary).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }))
    expect(onChange).toHaveBeenCalledWith(['climate-sense'])
  })

  it('cancels the previous search and ignores its late response', async () => {
    let finishOld!: (hits: VocabularySuggestionsPage) => void
    api.searchVocabulary
      .mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve }))
      .mockResolvedValueOnce(page('weather'))
    render(<VocabularySensePicker onChange={vi.fn()} value={[]} />)
    const input = screen.getByLabelText('Tìm từ vựng')
    fireEvent.change(input, { target: { value: 'climate' } })
    await advance(300)
    const oldSignal = api.searchVocabulary.mock.calls[0][2]!
    fireEvent.change(input, { target: { value: 'weather' } })
    await advance(300)
    expect(oldSignal.aborted).toBe(true)
    expect(screen.getByText('weather')).toBeInTheDocument()
    await act(async () => { finishOld(page('climate')) })
    expect(screen.getByText('weather')).toBeInTheDocument()
    expect(screen.queryByText('climate')).not.toBeInTheDocument()
  })

  it('suggests words while the input method is still composing', async () => {
    render(<VocabularySensePicker onChange={vi.fn()} value={[]} />)
    const input = screen.getByLabelText('Tìm từ vựng')
    fireEvent.compositionStart(input)
    fireEvent.input(input, { target: { value: 'climate' }, isComposing: true })
    await advance(299)
    expect(api.searchVocabulary).not.toHaveBeenCalled()
    await advance(1)
    expect(api.searchVocabulary).toHaveBeenCalledExactlyOnceWith('climate', 0, expect.any(AbortSignal))
    expect(screen.getByText('climate')).toBeInTheDocument()
    fireEvent.compositionEnd(input)
    await advance(300)
    expect(api.searchVocabulary).toHaveBeenCalledTimes(1)
  })

  it('shows the search spinner only while a request is pending', async () => {
    let finish!: (hits: VocabularySuggestionsPage) => void
    api.searchVocabulary.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    render(<VocabularySensePicker onChange={vi.fn()} value={[]} />)
    fireEvent.change(screen.getByLabelText('Tìm từ vựng'), { target: { value: 'climate' } })
    expect(screen.queryByText('Đang tìm từ vựng…')).not.toBeInTheDocument()
    await advance(300)
    expect(screen.getByText('Đang tìm từ vựng…')).toBeInTheDocument()
    await act(async () => { finish({ content: [], page: 0, size: 20, hasMore: false }) })
    expect(screen.queryByText('Đang tìm từ vựng…')).not.toBeInTheDocument()
    expect(screen.getByText('Không tìm thấy từ nào.')).toBeInTheDocument()
  })

  it('only suggests from two characters but allows explicitly looking up a one-letter word', async () => {
    api.searchVocabulary.mockResolvedValue(page('a'))
    render(<VocabularySensePicker onChange={vi.fn()} value={[]} />)
    const input = screen.getByLabelText('Tìm từ vựng')
    fireEvent.change(input, { target: { value: 'a' } })
    await advance(300)
    expect(api.searchVocabulary).not.toHaveBeenCalled()
    fireEvent.submit(input.closest('form')!)
    await advance(300)
    expect(api.searchVocabulary).toHaveBeenCalledExactlyOnceWith('a', 0, expect.any(AbortSignal))
    expect(screen.getByText('a')).toBeInTheDocument()
  })

  it('keeps rows and selections while loading another page and lets a failed page be retried', async () => {
    api.searchVocabulary.mockResolvedValueOnce(page('climate', 0, true))
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce(page('weather', 1))
    render(<VocabularySensePicker onChange={vi.fn()} value={['climate-sense']} />)
    fireEvent.change(screen.getByLabelText('Tìm từ vựng'), { target: { value: 'cl' } })
    await advance(300)
    expect(screen.getByRole('button', { name: 'Đã chọn' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm' }))
    await advance(0)
    expect(screen.getByText('climate')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await advance(0)
    expect(api.searchVocabulary).toHaveBeenLastCalledWith('cl', 1, expect.any(AbortSignal))
    expect(screen.getByText('weather')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đã chọn' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Tải thêm' })).not.toBeInTheDocument()
  })

  it('cancels a pending next page when the query changes', async () => {
    let finishMore!: (hits: VocabularySuggestionsPage) => void
    api.searchVocabulary.mockResolvedValueOnce(page('climate', 0, true))
      .mockImplementationOnce(() => new Promise((resolve) => { finishMore = resolve }))
      .mockResolvedValueOnce(page('weather'))
    render(<VocabularySensePicker onChange={vi.fn()} value={[]} />)
    const input = screen.getByLabelText('Tìm từ vựng')
    fireEvent.change(input, { target: { value: 'cl' } })
    await advance(300)
    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm' }))
    expect(screen.getByText('climate')).toBeInTheDocument()
    const oldSignal = api.searchVocabulary.mock.calls[1][2]!
    fireEvent.change(input, { target: { value: 'weather' } })
    expect(oldSignal.aborted).toBe(true)
    await advance(300)
    await act(async () => { finishMore(page('cloud', 1)) })
    expect(screen.getByText('weather')).toBeInTheDocument()
    expect(screen.queryByText('cloud')).not.toBeInTheDocument()
    expect(screen.queryByText('climate')).not.toBeInTheDocument()
  })
})
