import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { SpeakingSubmissionResultPage } from './SpeakingSubmissionResultPage'
import type { SpeakingSubmission } from './speakingPracticeApi'

const api = vi.hoisted(() => ({ getSpeakingSubmission: vi.fn(), settleSpeakingSubmission: vi.fn() }))
vi.mock('./speakingPracticeApi', () => api)
vi.mock('@/features/practice/writing/useWritingWallet', () => ({
  useWritingWallet: () => ({ client: undefined, isLoggedIn: true, onActivated: vi.fn() }),
}))

const display = {
  label: 'Điểm ước lượng để luyện tập',
  overallBand: null,
  summary: 'Bạn trả lời đúng ý nhưng câu còn ngắn.',
  focus: ['Nói câu dài hơn với một lý do'],
  criteria: [
    { code: 'FC', name: 'Fluency and coherence', band: 4.5, comment: 'Hay bị ngắt quãng.', strengths: ['Giữ được mạch chính'], weaknesses: [], evidence: [{ quote: 'I sleep and I spend time', note: 'Ý đơn giản' }] },
    { code: 'LR', name: 'Lexical resource', band: 5.0, comment: 'Từ vựng cơ bản.', strengths: [], weaknesses: [], evidence: [] },
    { code: 'GRA', name: 'Grammatical range and accuracy', band: 4.0, comment: 'Chủ yếu câu đơn. Cần thêm mệnh đề phụ.', strengths: [], weaknesses: ['Chưa dùng câu phức'], evidence: [{ quote: 'But I would like to exercise', note: 'Câu bắt đầu bằng But' }] },
    { code: 'PR', name: 'Pronunciation', band: 6.0, comment: 'Phát âm dễ hiểu.', strengths: [], weaknesses: [], evidence: [] },
  ],
  errors: [{ code: 'SPK_NO_LINKER', name: 'Thiếu từ nối', partNo: 1, excerpt: 'I sleep and I spend time', suggestion: 'Thêm because để nêu lý do.' }],
  pronunciation: {
    accuracy: 83, fluency: 90, pronunciation: 84,
    weakWords: [{ word: 'family', accuracy: 40, sounds: [{ symbol: 'f', accuracy: 30, heardAs: 'p' }], tip: 'Chạm răng trên vào môi dưới.' }],
    weakSounds: [{ symbol: 'f', count: 2, accuracy: 35, heardAs: 'p', words: ['family', 'fine'], tip: 'Đặt răng trên lên môi dưới rồi thổi hơi.' }],
  },
  rhythm: { wordsPerMinute: 120, longPauses: 3 },
  transcripts: [{
    partNo: 1, questionNo: 1, question: 'Do you work?', transcript: 'I am a student.',
    words: [
      { text: 'I', accuracy: 97, errorType: null, sounds: [{ symbol: 'aɪ', accuracy: 97, heardAs: null }] },
      { text: 'family', accuracy: 40, errorType: 'Mispronunciation', sounds: [{ symbol: 'f', accuracy: 30, heardAs: 'p' }, { symbol: 'æ', accuracy: 85, heardAs: null }] },
    ],
  }],
  transcriptQuality: { level: 'HIGH', warning: false, message: '' },
  bandLimits: [],
  partNotes: [],
  personalFeedback: { note: 'Hãy luyện câu có lý do.', studyPlan: ['Luyện 10 phút mỗi ngày'] },
}

function submission(status: SpeakingSubmission['status'], result: SpeakingSubmission['result'] = null): SpeakingSubmission {
  return { id: 'sub-1', packageVersionId: 'pv', scope: 'PART', status, pointCost: 5, failureCode: null, createdAt: '2026-11-04T10:00:00Z', recordings: [], result }
}

function renderPage() {
  return render(<MemoryRouter initialEntries={['/practice/speaking/submissions/sub-1/result']}>
    <Routes><Route path="/practice/speaking/submissions/:submissionId/result" element={<SpeakingSubmissionResultPage />} /></Routes>
  </MemoryRouter>)
}

describe('SpeakingSubmissionResultPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows the band, every criterion, the errors and the transcript of a graded submission', async () => {
    api.getSpeakingSubmission.mockResolvedValue(submission('GRADED', display))
    renderPage()

    expect(await screen.findByText('Đã chấm xong')).toBeInTheDocument()
    // No overall band for one part: the average of the four criteria, rounded to the nearest half band like an IELTS
    // overall band (4.875 shows as 5.0, never 4.9), is shown and said to be an average.
    expect(within(screen.getByRole('region', { name: 'Band Speaking' })).getByText('5.0')).toBeInTheDocument()
    expect(screen.getByText(/Trung bình các tiêu chí/)).toBeInTheDocument()
    // The weakest criterion is marked in the score panel and again on its own bar.
    expect(screen.getAllByText('Cần cải thiện nhất')).toHaveLength(2)
    expect(screen.getByRole('region', { name: 'Lỗi nên sửa' })).toHaveTextContent('Thiếu từ nối')
    // The word the speech service scored weakest is shown in the word-by-word view, with its sounds and the model's tip.
    const breakdown = screen.getByRole('region', { name: 'Phát âm từng từ, từng âm' })
    expect(within(breakdown).getByRole('button', { name: 'family' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(breakdown).getByRole('list', { name: 'Các âm của từ family' })).toHaveTextContent('/f/')
    expect(within(breakdown).getByText(/Chạm răng trên vào môi dưới/)).toBeInTheDocument()
    expect(screen.getAllByText('family').length).toBeGreaterThan(0)
    // The two lists of next steps each say what they are, so they never read as one list numbered twice.
    expect(screen.getByText('Trọng tâm cải thiện')).toBeInTheDocument()
    expect(screen.getByText('Kế hoạch luyện tập')).toBeInTheDocument()
    expect(screen.getByText('I am a student.')).toBeInTheDocument()
    expect(api.settleSpeakingSubmission).not.toHaveBeenCalled()
  })

  it('never talks about payment on the result page', async () => {
    api.getSpeakingSubmission.mockResolvedValue(submission('GRADED', display))
    const { container } = renderPage()
    await screen.findByText('Đã chấm xong')

    expect(container.textContent).not.toMatch(/thanh toán|nạp thêm/i)
  })

  it('releases a graded submission by itself and then shows it', async () => {
    api.getSpeakingSubmission.mockResolvedValue(submission('PAYMENT_PENDING'))
    api.settleSpeakingSubmission.mockResolvedValue(submission('GRADED', display))
    const { container } = renderPage()

    expect(await screen.findByText('Đã chấm xong')).toBeInTheDocument()
    expect(api.settleSpeakingSubmission).toHaveBeenCalledWith('sub-1')
    expect(container.textContent).not.toMatch(/thanh toán/i)
  })

  it('keeps the grade and offers a retry when the balance has fallen short', async () => {
    api.getSpeakingSubmission.mockResolvedValue(submission('PAYMENT_PENDING'))
    api.settleSpeakingSubmission.mockRejectedValueOnce(new HttpError(402, 'Not enough points', null, 'INSUFFICIENT_POINTS'))
    renderPage()

    expect(await screen.findByText('Chưa nhận được kết quả')).toBeInTheDocument()
    api.settleSpeakingSubmission.mockResolvedValue(submission('GRADED', display))
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Đã chấm xong')).toBeInTheDocument()
    expect(api.settleSpeakingSubmission).toHaveBeenCalledTimes(2)
  })

  it('says the grader is down, not that an examiner will look, and that the learner was not charged', async () => {
    api.getSpeakingSubmission.mockResolvedValue(submission('NEEDS_EXAMINER'))
    renderPage()

    expect(await screen.findByText('Hệ thống chấm đang lỗi')).toBeInTheDocument()
    expect(screen.getByText(/vui lòng thử lại sau/)).toBeInTheDocument()
    expect(screen.getByText(/không bị trừ point/)).toBeInTheDocument()
    expect(screen.queryByText(/giám khảo/i)).not.toBeInTheDocument()
  })

  it('shows a calm waiting message while the submission is being graded', async () => {
    api.getSpeakingSubmission.mockResolvedValue(submission('GRADING'))
    renderPage()

    expect(await screen.findByText('Đang chấm bài')).toBeInTheDocument()
    await waitFor(() => expect(api.getSpeakingSubmission).toHaveBeenCalledTimes(1))
  })

  it('says the AI marks are for reference only and points to the Premium plans for a teacher', async () => {
    api.getSpeakingSubmission.mockResolvedValue(submission('GRADED', display))
    renderPage()

    const note = await screen.findByRole('note')
    expect(note).toHaveTextContent('Điểm do AI chấm chỉ mang tính tham khảo.')
    expect(note).toHaveTextContent('giáo viên chấm trực tiếp')
    expect(screen.getByRole('button', { name: 'Xem gói Premium' })).toBeInTheDocument()
  })

  it('opens the Premium plans in a popup on the same page, then the key dialog for the chosen plan', async () => {
    api.getSpeakingSubmission.mockResolvedValue(submission('GRADED', display))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Xem gói Premium' }))
    const plans = await screen.findByRole('dialog')
    expect(within(plans).getByText('Premium 30 Ngày')).toBeInTheDocument()
    expect(within(plans).getByText('Premium 90 Ngày')).toBeInTheDocument()
    expect(within(plans).getByText('Phổ biến nhất')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kết quả chấm bài', hidden: true })).toBeInTheDocument() // still on the result page

    await userEvent.click(within(plans).getByRole('radio', { name: /Premium 30 Ngày/ }))
    await userEvent.click(within(plans).getByRole('button', { name: /Kích hoạt bằng Mã Key — Premium 30 Ngày/ }))

    const key = await screen.findByRole('dialog', { name: /Kích hoạt Gói/ })
    expect(key).toHaveTextContent('Premium 30 Ngày')
  })

  it('adds a line about hard-to-recognise speech only when the recording was hard to recognise', async () => {
    api.getSpeakingSubmission.mockResolvedValue(submission('GRADED', { ...display, transcriptQuality: { level: 'LOW', warning: true, message: 'x' } }))
    renderPage()

    expect(await screen.findByRole('note')).toHaveTextContent('khó nhận dạng')
  })

  it('opens the weakest criterion on arrival and keeps the others as one-line bars', async () => {
    api.getSpeakingSubmission.mockResolvedValue(submission('GRADED', display))
    renderPage()

    expect(await screen.findByText('Bấm vào từng tiêu chí để xem chi tiết')).toBeInTheDocument()
    const weakest = screen.getByRole('button', { name: /Grammatical range and accuracy/ })
    const fluency = screen.getByRole('button', { name: /Fluency and coherence/ })
    expect(weakest).toHaveAttribute('aria-expanded', 'true')
    expect(fluency).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Chưa dùng câu phức')).toBeInTheDocument()
    // A closed bar still says the main thing in one line (the first sentence of the comment).
    expect(within(fluency).getByText('Hay bị ngắt quãng.')).toBeInTheDocument()
  })

  it('opens one criterion at a time', async () => {
    api.getSpeakingSubmission.mockResolvedValue(submission('GRADED', display))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /Fluency and coherence/ }))

    expect(screen.getByRole('button', { name: /Fluency and coherence/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Grammatical range and accuracy/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Giữ được mạch chính')).toBeInTheDocument()
    expect(screen.queryByText('Chưa dùng câu phức')).not.toBeInTheDocument()
  })

  it('shows the three speech scores on the closed Pronunciation bar', async () => {
    api.getSpeakingSubmission.mockResolvedValue(submission('GRADED', display))
    renderPage()

    const pronunciation = await screen.findByRole('button', { name: /Pronunciation/ })
    expect(pronunciation).toHaveAttribute('aria-expanded', 'false')
    expect(within(pronunciation).getByText('83')).toBeInTheDocument()
    expect(within(pronunciation).getByText('90')).toBeInTheDocument()
    expect(within(pronunciation).getByText('84')).toBeInTheDocument()
  })})
