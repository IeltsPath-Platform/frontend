import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import type { DictationProgress, DictationVideoDetail } from '../api/videoDictationApi'
import { VideoDictationPlayerPage } from './VideoDictationPlayerPage'

const { apiMock, playerMock } = vi.hoisted(() => ({
  apiMock: { detail: vi.fn(), progress: vi.fn(), recordAttempt: vi.fn() },
  playerMock: { status: 'ready' as const, error: null, stalled: false, playSegment: vi.fn(), stop: vi.fn(), setRate: vi.fn() },
}))

vi.mock('../api/videoDictationApi', () => ({ videoDictationApi: apiMock }))
vi.mock('../hooks/useYouTubeSegmentPlayer', () => ({ useYouTubeSegmentPlayer: () => playerMock }))
vi.mock('@/components/SiteNavbar', () => ({ SiteNavbar: () => <nav aria-label="site" /> }))

const detail: DictationVideoDetail = {
  id: 'video-1', youtubeVideoId: 'yt1', youtubeUrl: 'https://y', title: 'Daily Routines', description: null,
  thumbnailUrl: null, durationSeconds: 60, level: 'A2',
  segments: [
    {
      id: 's1', sequenceNo: 1, startMs: 0, endMs: 3000, transcript: 'She goes to school every day', translationVi: 'Cô ấy đi học mỗi ngày',
      ipaWords: ['/ʃi/', '/ɡoʊz/', '/tu/', '/skul/', null, '/deɪ/'],
    },
    { id: 's2', sequenceNo: 2, startMs: 3000, endMs: 6000, transcript: 'He likes tea', translationVi: null, ipaWords: ['/hi/', '/laɪks/', '/ti/'] },
  ],
}
const progress = (passedIds: string[]): DictationProgress => ({
  videoId: 'video-1', totalSegments: 2, passedSegments: passedIds.length,
  nextSegmentId: passedIds.length === 2 ? null : passedIds.includes('s1') ? 's2' : 's1',
  nextSequenceNo: passedIds.length === 2 ? null : passedIds.includes('s1') ? 2 : 1,
  segments: detail.segments.map((s) => ({
    segmentId: s.id, sequenceNo: s.sequenceNo, attempts: passedIds.includes(s.id) ? 1 : 0,
    bestAccuracyPercent: passedIds.includes(s.id) ? 100 : null, passed: passedIds.includes(s.id),
  })),
})

const renderPage = () => render(
  <MemoryRouter initialEntries={['/video-dictation/video-1']}>
    <Routes>
      <Route path="/video-dictation/:videoId" element={<VideoDictationPlayerPage />} />
      <Route path="/video-dictation" element={<p>library</p>} />
    </Routes>
  </MemoryRouter>,
)

/** Presses play and lets the fake player reach the end of the sentence, as the real one does after it plays. */
async function listenToSentence() {
  fireEvent.click(await screen.findByRole('button', { name: /Bắt đầu nghe câu|Câu tiếp/ }))
}
function sentenceEnds() {
  const onEnd = playerMock.playSegment.mock.calls.at(-1)?.[2] as () => void
  act(() => onEnd())
}
const type = (value: string) => fireEvent.change(screen.getByLabelText('Câu bạn nghe được'), { target: { value } })

describe('VideoDictationPlayerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    playerMock.stalled = false
    apiMock.detail.mockResolvedValue(detail)
    apiMock.progress.mockResolvedValue(progress([]))
    apiMock.recordAttempt.mockResolvedValue({})
    window.localStorage.clear()
  })

  it('arranges the page as compact, theater or stacked, and remembers the choice', async () => {
    const { container, unmount } = renderPage()
    await screen.findByRole('button', { name: /Thu gọn/ })
    const main = container.querySelector('main')
    expect(main).toHaveAttribute('data-layout', 'compact')
    expect(screen.getByRole('button', { name: /Thu gọn/ })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: /Rạp chiếu/ }))
    expect(main).toHaveAttribute('data-layout', 'theater')
    fireEvent.click(screen.getByRole('button', { name: /Xếp dọc/ }))
    expect(main).toHaveAttribute('data-layout', 'stacked')

    unmount()
    const next = renderPage()
    await waitFor(() => expect(next.container.querySelector('main')).toHaveAttribute('data-layout', 'stacked'))
  })

  it('opens on the first sentence not passed yet and plays only that sentence', async () => {
    apiMock.progress.mockResolvedValue(progress(['s1']))
    renderPage()

    expect(await screen.findByText('Câu 2 / 2 · ✓ 1 đã qua')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu nghe câu 2/ }))
    expect(playerMock.playSegment).toHaveBeenCalledWith(3000, 6000, expect.any(Function))
  })

  it('keeps the answer box open while the sentence plays', async () => {
    renderPage()
    await listenToSentence()

    expect(screen.getByLabelText('Câu bạn nghe được')).toBeEnabled()
    type('She goes')
    expect(screen.getByRole('button', { name: 'Kiểm tra' })).toBeEnabled()
    sentenceEnds()
    expect(screen.getByLabelText('Câu bạn nghe được')).toHaveValue('She goes')
  })

  it('shows one covered tile per word and uncovers a word, or all of them, on a click', async () => {
    renderPage()
    expect(screen.queryByText(/Nhấn vào ô để xem từ/)).not.toBeInTheDocument()
    await listenToSentence()

    expect(screen.getByText(/câu có 6 từ/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Từ \d, bấm để xem$/ })).toHaveLength(6)
    expect(screen.queryByText('goes')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Từ 2, bấm để xem' }))
    expect(screen.getByRole('button', { name: 'goes' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('school')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'goes' }))
    expect(screen.queryByText('goes')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hiện tất cả' }))
    expect(screen.getByText('school')).toBeInTheDocument()
    expect(screen.getByText('day')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ẩn tất cả' }))
    expect(screen.queryByText('school')).not.toBeInTheDocument()
  })

  it('shows the pronunciation under an uncovered word, and none for a word without one', async () => {
    renderPage()
    await listenToSentence()

    expect(screen.queryByText('/ɡoʊz/')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Từ 2, bấm để xem' }))
    expect(screen.getByText('goes')).toBeInTheDocument()
    expect(screen.getByText('/ɡoʊz/')).toBeInTheDocument()
    expect(screen.queryByText('/skul/')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hiện tất cả' }))
    expect(screen.getByText('/skul/')).toBeInTheDocument()
    expect(screen.getByText('/deɪ/')).toBeInTheDocument()
    // "every" has no pronunciation: its tile shows the word alone.
    expect(screen.getByRole('button', { name: 'every' })).toHaveTextContent(/^every$/)
    fireEvent.click(screen.getByRole('button', { name: 'Ẩn tất cả' }))
    expect(screen.queryByText('/skul/')).not.toBeInTheDocument()
  })

  it('opens and closes the Vietnamese meaning of the sentence, and offers none for a sentence without one', async () => {
    renderPage()
    await listenToSentence()

    expect(screen.queryByText('Cô ấy đi học mỗi ngày')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xem nghĩa' }))
    expect(screen.getByText('Cô ấy đi học mỗi ngày')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ẩn nghĩa' }))
    expect(screen.queryByText('Cô ấy đi học mỗi ngày')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Xem nghĩa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua ›' }))
    // Sentence 2 has no translation: no button, and sentence 1's meaning is gone.
    expect(screen.queryByRole('button', { name: /nghĩa/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Cô ấy đi học mỗi ngày')).not.toBeInTheDocument()
  })

  it('covers the words again for the next sentence', async () => {
    renderPage()
    await listenToSentence()
    fireEvent.click(screen.getByRole('button', { name: 'Hiện tất cả' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua ›' }))

    expect(screen.getByText(/câu có 3 từ/)).toBeInTheDocument()
    expect(screen.queryByText('likes')).not.toBeInTheDocument()
  })

  it('replays the sentence when the video is clicked, as often as wanted, without losing what was typed', async () => {
    renderPage()
    expect(screen.queryByRole('button', { name: /Nghe lại câu/ })).not.toBeInTheDocument()
    await listenToSentence()
    sentenceEnds()
    type('She goes to')

    for (let times = 1; times <= 4; times += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Nghe lại câu 1' }))
      expect(playerMock.playSegment).toHaveBeenCalledTimes(1 + times)
      expect(playerMock.playSegment).toHaveBeenLastCalledWith(0, 3000, expect.any(Function))
      expect(screen.getByLabelText('Câu bạn nghe được')).toHaveValue('She goes to')
      sentenceEnds()
    }

    // Alt+R replays from the keyboard, so the learner never has to leave the box.
    fireEvent.keyDown(screen.getByLabelText('Câu bạn nghe được'), { key: 'r', altKey: true })
    expect(playerMock.playSegment).toHaveBeenCalledTimes(6)
    expect(apiMock.recordAttempt).not.toHaveBeenCalled()
  })

  it('hands the video over to YouTube when it does not start: no covering button, a notice and a retry', async () => {
    renderPage()
    await listenToSentence()
    expect(screen.getByRole('button', { name: 'Nghe lại câu 1' })).toBeInTheDocument()

    playerMock.stalled = true
    type('She')   // any state change re-renders the page with the stalled player
    expect(screen.queryByRole('button', { name: 'Nghe lại câu 1' })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Video chưa tự phát được')

    const before = playerMock.playSegment.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }))
    expect(playerMock.playSegment).toHaveBeenCalledTimes(before + 1)
  })

  it('stops the video when the answer is checked while it still plays', async () => {
    renderPage()
    await listenToSentence()
    type('She goes to school every day')
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }))

    expect(playerMock.stop).toHaveBeenCalled()
    expect(await screen.findByText(/Chính xác · 100%/)).toBeInTheDocument()
  })

  it('marks a wrong answer, records it, then passes on the retry and moves to the next sentence', async () => {
    renderPage()
    await listenToSentence()
    sentenceEnds()

    type('She go to school every day')
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    expect(await screen.findByText(/Chưa đúng · 83.33%/)).toBeInTheDocument()
    expect(screen.getByText('go')).toHaveClass('vdp-wrong')
    expect(screen.getByText(/Cô ấy đi học mỗi ngày/)).toBeInTheDocument()
    expect(apiMock.recordAttempt).toHaveBeenLastCalledWith(
      { segmentId: 's1', typedText: 'She go to school every day', correct: false, accuracyPercent: 83.33 })

    fireEvent.click(screen.getByRole('button', { name: /Thử lại · lần 2 \/ 5/ }))
    type('She goes to school every day.')
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    expect(await screen.findByText(/Chính xác · 100%/)).toBeInTheDocument()
    expect(apiMock.recordAttempt).toHaveBeenLastCalledWith(
      { segmentId: 's1', typedText: 'She goes to school every day.', correct: true, accuracyPercent: 100 })

    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp ›' }))
    expect(playerMock.playSegment).toHaveBeenLastCalledWith(3000, 6000, expect.any(Function))
    expect(screen.getByText('Câu 2 / 2 · ✓ 1 đã qua')).toBeInTheDocument()
  })

  it('shows the answer after five misses without counting the sentence as passed', async () => {
    renderPage()
    await listenToSentence()
    sentenceEnds()

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      type('wrong words only')
      fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }))
      await screen.findByText(/Chưa đúng/)
      if (attempt < 5) {
        expect(screen.queryByText('She goes to school every day')).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }))
      }
    }

    expect(screen.getByText('She goes to school every day')).toBeInTheDocument()
    expect(screen.getByText(/Đã hết 5 lần thử/)).toBeInTheDocument()
    expect(screen.getByText('Câu 1 / 2 · ✓ 0 đã qua')).toBeInTheDocument()
    expect(apiMock.recordAttempt).toHaveBeenCalledTimes(5)
  })

  it('finishes after the last sentence and offers to practice the ones not passed', async () => {
    apiMock.progress.mockResolvedValue(progress(['s1']))
    renderPage()
    await listenToSentence()
    sentenceEnds()

    type('He like tea')
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    await screen.findByText(/Chưa đúng/)
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua ›' }))

    expect(await screen.findByRole('heading', { name: 'Hoàn thành video' })).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('He likes tea')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Làm lại video' }))
    expect(playerMock.playSegment).toHaveBeenLastCalledWith(0, 3000, expect.any(Function))
  })

  it('offers "Hoàn thành" instead of "Câu tiếp" on the last sentence', async () => {
    apiMock.progress.mockResolvedValue(progress(['s1']))
    renderPage()
    await listenToSentence()
    type('He likes tea')
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    await screen.findByText(/Chính xác · 100%/)

    expect(screen.queryByRole('button', { name: 'Câu tiếp ›' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn thành' }))
    expect(await screen.findByRole('heading', { name: 'Hoàn thành video' })).toBeInTheDocument()
  })

  it('averages the accuracy over the whole video and shows untyped sentences as not done', async () => {
    apiMock.progress.mockResolvedValue({
      ...progress(['s1']),
      segments: [
        { segmentId: 's1', sequenceNo: 1, attempts: 1, bestAccuracyPercent: 100, passed: true },
        { segmentId: 's2', sequenceNo: 2, attempts: 0, bestAccuracyPercent: null, passed: false },
      ],
    })
    renderPage()
    await listenToSentence()
    sentenceEnds()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua ›' }))

    expect(await screen.findByRole('heading', { name: 'Hoàn thành video' })).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument() // (100 + 0) / 2
    expect(screen.getByText('Chưa làm')).toBeInTheDocument()
    // Every sentence is listed, the passed ones too, each with its own redo button.
    expect(screen.getByText('She goes to school every day')).toBeInTheDocument()
    expect(screen.getByText('Đạt · 1 lần gõ · tốt nhất 100%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Làm lại câu 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Làm lại câu 2' })).toBeInTheDocument()
  })

  it('redoes one sentence from the summary and comes back to the summary afterwards', async () => {
    apiMock.progress.mockResolvedValue(progress(['s1']))
    renderPage()
    await listenToSentence()
    sentenceEnds()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua ›' }))
    await screen.findByRole('heading', { name: 'Hoàn thành video' })

    fireEvent.click(screen.getByRole('button', { name: 'Làm lại câu 2' }))
    expect(playerMock.playSegment).toHaveBeenLastCalledWith(3000, 6000, expect.any(Function))
    type('He likes tea')
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    await screen.findByText(/Chính xác · 100%/)
    expect(screen.queryByRole('button', { name: 'Câu tiếp ›' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn thành' }))

    expect(await screen.findByRole('heading', { name: 'Hoàn thành video' })).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('opens straight on the summary when every sentence is already passed', async () => {
    apiMock.progress.mockResolvedValue(progress(['s1', 's2']))
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Hoàn thành video' })).toBeInTheDocument()
  })

  it('shows a not-found message and can retry', async () => {
    apiMock.detail.mockRejectedValueOnce(new HttpError(404, 'nf')).mockResolvedValueOnce(detail)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy video này')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Bắt đầu nghe câu 1/ })).toBeInTheDocument())
  })
})
