import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { ToastProvider } from '@/components/toast/ToastProvider'
import { SpeakingReviewPage } from './SpeakingReviewPage'
import { RecordingTooLongError } from './sendSpeakingSubmission'
import { clearSession, getRecording, saveRecording } from './speakingSession'
import type { SpeakingTask } from './speakingApi'

const api = vi.hoisted(() => ({ getSpeakingTask: vi.fn() }))
const wallet = vi.hoisted(() => ({ checkAccess: vi.fn() }))
const sender = vi.hoisted(() => ({ send: vi.fn() }))
const terms = vi.hoisted(() => ({ getSpeakingTerms: vi.fn(), getSpeakingSubmission: vi.fn(), settleSpeakingSubmission: vi.fn() }))

vi.mock('@/components/SiteNavbar', () => ({ SiteNavbar: () => null }))
vi.mock('./speakingApi', () => api)
vi.mock('./speakingPracticeApi', () => terms)
vi.mock('./sendSpeakingSubmission', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./sendSpeakingSubmission')>()),
  sendSpeakingSubmission: sender.send,
}))
vi.mock('../writing/useWritingWallet', () => ({
  useWritingWallet: () => ({ client: undefined, isLoggedIn: true, balance: null, error: '', check: () => Promise.resolve(2), checkAccess: wallet.checkAccess, onActivated: vi.fn() }),
}))

const SERVER_TERMS = { enabled: true, pointCost: 9, maxRecordingBytes: 6 * 1024 * 1024, retentionDays: 90 }

const PART_1 = '00000000-0000-0000-0000-000000000001'
const PART_2 = '00000000-0000-0000-0000-000000000002'

function task(sectionId: string, partNo: number, prompts: string[]): SpeakingTask {
  return {
    packageId: 'p', packageVersionId: 'pv', sectionId, packageTitle: 'Package', title: `Part ${partNo}: Topic`, partNo,
    timeLimitSeconds: null, instructions: null,
    questions: prompts.map((prompt, index) => ({ questionVersionId: `${sectionId}-q${index}`, sortOrder: index + 1, prompt, durationSeconds: 45 })),
  }
}

const recording = (seconds: number, silent = false) => ({ blob: new Blob(['x']), durationSeconds: seconds, silent, inputName: 'Microphone Array' })

function renderReview(path = `/practice/speaking/review/pv?parts=${PART_1},${PART_2}`) {
  render(
    <ToastProvider><MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/practice/speaking/review/:packageVersionId" element={<SpeakingReviewPage />} />
        <Route path="/practice-tests" element={<p>Danh mục luyện tập</p>} />
      </Routes>
    </MemoryRouter></ToastProvider>,
  )
}

describe('SpeakingReviewPage', () => {
  beforeEach(() => {
    clearSession('pv')
    sender.send.mockReset()
    terms.getSpeakingTerms.mockReset()
    terms.getSpeakingTerms.mockResolvedValue(SERVER_TERMS)
    // A submission that is still being graded, unless a test says otherwise.
    terms.getSpeakingSubmission.mockReset().mockReturnValue(new Promise(() => undefined))
    api.getSpeakingTask.mockImplementation(async (_version: string, sectionId: string) => (
      sectionId === PART_1 ? task(PART_1, 1, ['Where is your hometown?', 'What do you like about it?']) : task(PART_2, 2, ['Describe a teacher who influenced you. You should say: who the teacher was, and why.'])
    ))
  })

  afterEach(() => {
    clearSession('pv')
    vi.unstubAllGlobals()
  })

  it('lists every question of every part with its recording', async () => {
    saveRecording('pv', `${PART_1}-q0`, recording(12))
    saveRecording('pv', `${PART_1}-q1`, recording(20, true))
    renderReview()

    expect(await screen.findByRole('heading', { name: 'Xem lại bài Speaking của bạn' })).toBeInTheDocument()
    expect(screen.getByText('Where is your hometown?')).toBeInTheDocument()
    // A cue card is listed by its topic.
    expect(screen.getByText('Describe a teacher who influenced you.')).toBeInTheDocument()
    expect(screen.getByText('Đã ghi âm · 00:12')).toBeInTheDocument()
    expect(screen.getByText('Không thu được tiếng nói')).toBeInTheDocument()
    expect(screen.getByText('Chưa ghi âm')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('2/3 câu')
    expect(screen.getByRole('status')).toHaveTextContent('Còn 1 câu chưa ghi âm.')
  })

  it('says the recordings are complete when every question has one with sound', async () => {
    ;[`${PART_1}-q0`, `${PART_1}-q1`, `${PART_2}-q0`].forEach((id) => saveRecording('pv', id, recording(10)))
    renderReview()

    await screen.findByRole('heading', { name: 'Xem lại bài Speaking của bạn' })
    expect(screen.getByRole('status')).toHaveTextContent('3/3 câu')
    expect(screen.getByRole('status')).toHaveTextContent('Đã đủ bản ghi.')
  })

  it('asks for a new recording where the old one carried no sound', async () => {
    ;[`${PART_1}-q0`, `${PART_2}-q0`].forEach((id) => saveRecording('pv', id, recording(10)))
    saveRecording('pv', `${PART_1}-q1`, recording(10, true))
    renderReview()

    await screen.findByRole('heading', { name: 'Xem lại bài Speaking của bạn' })
    expect(screen.getByRole('status')).toHaveTextContent('1 bản ghi không có tiếng. Hãy ghi lại các câu đó.')
  })

  it('links each question back to where it is recorded', async () => {
    saveRecording('pv', `${PART_1}-q0`, recording(12))
    renderReview()

    await screen.findByRole('heading', { name: 'Xem lại bài Speaking của bạn' })
    const parts = `parts=${PART_1},${PART_2}`
    expect(screen.getByRole('link', { name: 'Ghi lại câu 1' })).toHaveAttribute('href', `/practice/speaking/tasks/pv/${PART_1}?${parts}&q=0`)
    expect(screen.getByRole('link', { name: 'Ghi âm câu 2' })).toHaveAttribute('href', `/practice/speaking/tasks/pv/${PART_1}?${parts}&q=1`)
    expect(screen.getByRole('link', { name: 'Ghi âm câu 1' })).toHaveAttribute('href', `/practice/speaking/tasks/pv/${PART_2}?${parts}&q=0`)
    // "Quay lại" returns to the last question of the last part.
    expect(screen.getByRole('link', { name: /Quay lại/ })).toHaveAttribute('href', `/practice/speaking/tasks/pv/${PART_2}?${parts}&q=0`)
  })

  it('plays a recording, and stops it when pressed again', async () => {
    const play = vi.fn(() => Promise.resolve())
    const pause = vi.fn()
    vi.stubGlobal('Audio', class { play = play; pause = pause; onended = null; onerror = null })
    URL.createObjectURL = vi.fn(() => 'blob:recording')
    URL.revokeObjectURL = vi.fn()
    saveRecording('pv', `${PART_1}-q0`, recording(12))
    renderReview()

    await userEvent.click(await screen.findByRole('button', { name: 'Nghe lại câu 1' }))
    expect(play).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Dừng nghe câu 1' }))
    expect(pause).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Nghe lại câu 1' })).toBeInTheDocument()
  })

  it('offers no way to listen to a question that has no recording', async () => {
    renderReview()

    await screen.findByRole('heading', { name: 'Xem lại bài Speaking của bạn' })
    expect(screen.queryByRole('button', { name: /Nghe lại câu/ })).not.toBeInTheDocument()
  })

  describe('"Tiếp tục"', () => {
    const recordAll = () => [`${PART_1}-q0`, `${PART_1}-q1`, `${PART_2}-q0`].forEach((id) => saveRecording('pv', id, recording(10)))

    it('stays closed while a question has no recording, and says why', async () => {
      saveRecording('pv', `${PART_1}-q0`, recording(10))
      renderReview()

      const button = await screen.findByRole('button', { name: 'Tiếp tục' })
      expect(button).toBeDisabled()
      expect(button).toHaveAccessibleDescription(/Còn 2 câu chưa ghi âm/)
    })

    it('stays closed while a recording has no sound', async () => {
      saveRecording('pv', `${PART_1}-q0`, recording(10))
      saveRecording('pv', `${PART_1}-q1`, recording(10, true))
      saveRecording('pv', `${PART_2}-q0`, recording(10))
      renderReview()

      expect(await screen.findByRole('button', { name: 'Tiếp tục' })).toBeDisabled()
    })

    it('shows a learner with enough points the cost and what will be left, with no grader to choose', async () => {
      recordAll()
      wallet.checkAccess.mockResolvedValue({ balance: 12, subscription: null })
      renderReview()

      await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }))

      await screen.findByRole('checkbox')
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText(/Speaking · Part 1, Part 2/)).toBeInTheDocument()
      expect(within(dialog).getByText(`−${SERVER_TERMS.pointCost} point`)).toBeInTheDocument()
      expect(within(dialog).getByText('12 point')).toBeInTheDocument()
      expect(within(dialog).getByText(`${12 - SERVER_TERMS.pointCost} point`)).toBeInTheDocument()
      expect(screen.queryByText('Chọn cách chấm bài')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Chọn giáo viên' })).not.toBeInTheDocument()
    })

    it('offers no grading and guesses no price when terms fail, and keeps all recordings', async () => {
      terms.getSpeakingTerms.mockRejectedValue(new Error('terms unavailable'))
      recordAll()
      wallet.checkAccess.mockResolvedValue({ balance: 20, subscription: null })
      renderReview()
      await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }))

      const dialog = await screen.findByRole('dialog')
      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Chưa tải được điều khoản chấm.')
      expect(within(dialog).queryByRole('button', { name: /Chấm bài/ })).not.toBeInTheDocument()
      expect(within(dialog).queryByText(/\d+ point/)).not.toBeInTheDocument()
      expect(sender.send).not.toHaveBeenCalled()
      expect(getRecording('pv', `${PART_1}-q0`)).not.toBeNull()
      expect(getRecording('pv', `${PART_1}-q1`)).not.toBeNull()
      expect(getRecording('pv', `${PART_2}-q0`)).not.toBeNull()
    })

    it('retries terms and sends only after confirming the returned price and upload limit', async () => {
      const retriedTerms = { ...SERVER_TERMS, pointCost: 13, maxRecordingBytes: 4 * 1024 * 1024 }
      terms.getSpeakingTerms.mockRejectedValueOnce(new Error('terms unavailable')).mockResolvedValue(retriedTerms)
      sender.send.mockResolvedValue({ id: 'submission-1' })
      recordAll()
      wallet.checkAccess.mockResolvedValue({ balance: 30, subscription: null })
      renderReview()
      await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }))
      await within(await screen.findByRole('dialog')).findByRole('alert')
      await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

      await screen.findByRole('checkbox')
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('−13 point')).toBeInTheDocument()
      expect(terms.getSpeakingTerms).toHaveBeenCalledTimes(2)
      expect(sender.send).not.toHaveBeenCalled()
      await userEvent.click(within(dialog).getByRole('checkbox'))
      await userEvent.click(within(dialog).getByRole('button', { name: /Chấm bài · 13 point/ }))
      expect(sender.send).toHaveBeenCalledTimes(1)
      expect(sender.send.mock.calls[0][0].maxRecordingBytes).toBe(retriedTerms.maxRecordingBytes)
    })

    it('offers no grading when retried terms explicitly disable Speaking grading', async () => {
      terms.getSpeakingTerms.mockRejectedValueOnce(new Error('terms unavailable'))
        .mockResolvedValue({ ...SERVER_TERMS, enabled: false })
      recordAll()
      wallet.checkAccess.mockResolvedValue({ balance: 30, subscription: null })
      renderReview()
      await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }))
      await within(await screen.findByRole('dialog')).findByRole('alert')
      await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

      expect(await screen.findByText(/Chấm Speaking bằng AI hiện chưa được bật/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Chấm bài/ })).not.toBeInTheDocument()
      expect(sender.send).not.toHaveBeenCalled()
    })

    it('offers no grading while terms load and does not reopen a dismissed loading dialog', async () => {
      let resolveTerms!: (value: typeof SERVER_TERMS) => void
      terms.getSpeakingTerms.mockReturnValue(new Promise((resolve) => { resolveTerms = resolve }))
      recordAll()
      wallet.checkAccess.mockResolvedValue({ balance: 30, subscription: null })
      renderReview()
      await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByRole('status')).toHaveTextContent('Đang kiểm tra tài khoản…')
      expect(within(dialog).queryByRole('button', { name: /Chấm bài/ })).not.toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Thử lại' })).toBeDisabled()
      await userEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }))
      await act(async () => resolveTerms(SERVER_TERMS))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(sender.send).not.toHaveBeenCalled()
      expect(getRecording('pv', `${PART_1}-q0`)).not.toBeNull()
    })

    /** Opens the confirmation with enough points, as far as the button that sends. */
    async function openConfirmation(balance = 12) {
      recordAll()
      wallet.checkAccess.mockResolvedValue({ balance, subscription: null })
      renderReview()
      await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }))
      await screen.findByRole('checkbox')
      return screen.getByRole('dialog')
    }

    const sendButton = (dialog: HTMLElement) => within(dialog).getByRole('button', { name: new RegExp(`Chấm bài · ${SERVER_TERMS.pointCost} point`) })

    it('shows the cost and what is sent, and does not send before the learner agrees', async () => {
      const dialog = await openConfirmation()

      expect(within(dialog).getByText('Chấm bài bằng AI')).toBeInTheDocument()
      expect(within(dialog).getByText(`${12 - SERVER_TERMS.pointCost} point`)).toBeInTheDocument()
      expect(within(dialog).getByText('3 bản ghi · tổng 00:30 ✓')).toBeInTheDocument()
      expect(sendButton(dialog)).toBeDisabled()

      await userEvent.click(within(dialog).getByRole('checkbox', { name: /đồng ý gửi bản ghi/ }))
      expect(sendButton(dialog)).toBeEnabled()
      expect(sender.send).not.toHaveBeenCalled()

      await userEvent.click(within(dialog).getByRole('button', { name: 'Quay lại xem lại bài' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(getRecording('pv', `${PART_1}-q0`)).not.toBeNull()
    })

    const goOn = async () => userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }))

    it('sends every answer with its label, says it was received, then shows the grading and drops the local copies', async () => {
      sender.send.mockResolvedValue({ id: 'submission-1', pointCost: 9 })
      const dialog = await openConfirmation()
      await userEvent.click(within(dialog).getByRole('checkbox'))

      await userEvent.click(sendButton(dialog))

      const received = await screen.findByRole('dialog')
      expect(await within(received).findByText('Đã nhận bài')).toBeInTheDocument()
      expect(within(received).getByText(/9 point chỉ bị trừ khi AI chấm xong/)).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Kết quả chấm bài' })).not.toBeInTheDocument()

      await goOn()

      expect(await screen.findByRole('heading', { name: 'Kết quả chấm bài' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Đang phân tích giọng nói' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      const input = sender.send.mock.calls[0][0]
      expect(input.packageVersionId).toBe('pv')
      expect(input.partSectionIds).toEqual([PART_1, PART_2])
      expect(input.requestId).toMatch(/^[0-9a-f-]{36}$/)
      expect(input.recordings.map((item: { questionVersionId: string; label: string }) => [item.questionVersionId, item.label])).toEqual([
        [`${PART_1}-q0`, 'Part 1, câu 1'], [`${PART_1}-q1`, 'Part 1, câu 2'], [`${PART_2}-q0`, 'Part 2, câu 1'],
      ])
      expect(getRecording('pv', `${PART_1}-q0`)).toBeNull()
    })

    it('stays in the popup while the answers are sent, with no way to leave it', async () => {
      sender.send.mockReturnValue(new Promise(() => undefined))
      const dialog = await openConfirmation()
      await userEvent.click(within(dialog).getByRole('checkbox'))

      await userEvent.click(sendButton(dialog))

      const sending = await screen.findByRole('dialog')
      expect(within(sending).getByRole('status')).toHaveTextContent('Đang gửi bài…')
      await userEvent.click(within(sending).getByRole('button', { name: 'Đóng' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Kết quả chấm bài' })).not.toBeInTheDocument()
    })

    it('shows the waiting screen and then the result on this same page, without going to another page', async () => {
      sender.send.mockResolvedValue({ id: 'submission-1' })
      let finish: (value: unknown) => void = () => undefined
      terms.getSpeakingSubmission.mockReturnValue(new Promise((resolve) => { finish = resolve }))
      const dialog = await openConfirmation()
      await userEvent.click(within(dialog).getByRole('checkbox'))
      await userEvent.click(sendButton(dialog))
      await goOn()

      // The waiting screen is here, in the place of the review, and the address did not change.
      expect(await screen.findByRole('heading', { name: 'Kết quả chấm bài' })).toBeInTheDocument()
      expect(screen.getByRole('status', { name: 'Tiến trình chấm bài' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Xem lại bài Speaking của bạn' })).not.toBeInTheDocument()
      expect(screen.queryByText('Danh mục luyện tập')).not.toBeInTheDocument()

      await act(async () => {
        finish({ id: 'submission-1', packageVersionId: 'pv', scope: 'FULL', status: 'GRADED', pointCost: 5, failureCode: null,
          createdAt: '', recordings: [], result: { label: 'Điểm ước lượng để luyện tập', overallBand: 6.5, summary: 'Bài nói rõ ràng.',
            criteria: [{ code: 'FC', name: 'Fluency and coherence', band: 6.5, comment: 'Nói mạch lạc.', strengths: [], weaknesses: [], evidence: [] }] } })
      })

      expect(await screen.findByText('Đã chấm xong')).toBeInTheDocument()
      expect(screen.queryByRole('status', { name: 'Tiến trình chấm bài' })).not.toBeInTheDocument()
    })

    it('keeps the recordings and the same request id when sending fails, so sending again continues', async () => {
      sender.send.mockRejectedValueOnce(new HttpError(0, 'offline')).mockResolvedValueOnce({ id: 'submission-1' })
      const dialog = await openConfirmation()
      await userEvent.click(within(dialog).getByRole('checkbox'))

      await userEvent.click(sendButton(dialog))
      expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối khi gửi bài')
      expect(getRecording('pv', `${PART_1}-q0`)).not.toBeNull()

      await userEvent.click(sendButton(screen.getByRole('dialog')))
      await goOn()
      expect(await screen.findByRole('heading', { name: 'Kết quả chấm bài' })).toBeInTheDocument()
      expect(sender.send.mock.calls[1][0].requestId).toBe(sender.send.mock.calls[0][0].requestId)
    })

    it('opens the key dialog when the server says the points are short, whatever the balance read before', async () => {
      sender.send.mockRejectedValue(new HttpError(402, 'Grading costs 5 points', null, 'INSUFFICIENT_POINTS'))
      const dialog = await openConfirmation()
      await userEvent.click(within(dialog).getByRole('checkbox'))

      await userEvent.click(sendButton(dialog))

      expect(await screen.findByText('Bạn chưa đủ point để chấm bài')).toBeInTheDocument()
      expect(getRecording('pv', `${PART_1}-q0`)).not.toBeNull()
    })

    it('tells the learner who already has a submission waiting', async () => {
      sender.send.mockRejectedValue(new HttpError(409, 'in progress', null, 'SPEAKING_SUBMISSION_IN_PROGRESS'))
      const dialog = await openConfirmation()
      await userEvent.click(within(dialog).getByRole('checkbox'))

      await userEvent.click(sendButton(dialog))

      expect(await screen.findByRole('alert')).toHaveTextContent('đang có một bài Speaking chờ chấm')
    })

    it('says which answer is too long to send', async () => {
      sender.send.mockRejectedValue(new RecordingTooLongError('Part 2, câu 1', 160))
      const dialog = await openConfirmation()
      await userEvent.click(within(dialog).getByRole('checkbox'))

      await userEvent.click(sendButton(dialog))

      expect(await screen.findByRole('alert')).toHaveTextContent('Part 2, câu 1 dài quá giới hạn')
    })

    it('uses the server price and recording limit', async () => {
      terms.getSpeakingTerms.mockResolvedValue({ pointCost: 7, maxRecordingBytes: 10 * 1024 * 1024, retentionDays: 90 })
      sender.send.mockResolvedValue({ id: 'submission-1' })
      recordAll()
      wallet.checkAccess.mockResolvedValue({ balance: 20, subscription: null })
      renderReview()

      await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }))

      await userEvent.click(await screen.findByRole('checkbox'))
      await userEvent.click(screen.getByRole('button', { name: /Chấm bài · 7 point/ }))
      expect(sender.send.mock.calls[0][0].maxRecordingBytes).toBe(10 * 1024 * 1024)
    })

    it('takes a Premium learner straight to the confirmation, with no points shown, even with an empty wallet', async () => {
      sender.send.mockResolvedValue({ id: 'submission-1', pointCost: 0 })
      recordAll()
      wallet.checkAccess.mockResolvedValue({ balance: 0, subscription: { status: 'ACTIVE', endsAt: '2099-01-01T00:00:00Z', remainingCredits: 0 } })
      renderReview()

      await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }))

      expect(await screen.findByRole('button', { name: 'Chấm bài' })).toBeDisabled()
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).queryByText(/point/i)).not.toBeInTheDocument()
      await userEvent.click(within(dialog).getByRole('checkbox'))
      await userEvent.click(within(dialog).getByRole('button', { name: 'Chấm bài' }))

      expect(await screen.findByText('Đã nhận bài')).toBeInTheDocument()
      expect(within(screen.getByRole('dialog')).queryByText(/point/i)).not.toBeInTheDocument()
      expect(sender.send).toHaveBeenCalledTimes(1)
    })

    it('treats an ended subscription as a learner who pays with points', async () => {
      recordAll()
      wallet.checkAccess.mockResolvedValue({ balance: 20, subscription: { status: 'ACTIVE', endsAt: '2000-01-01T00:00:00Z', remainingCredits: 4 } })
      renderReview()

      await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }))

      expect(await screen.findByText(`−${SERVER_TERMS.pointCost} point`)).toBeInTheDocument()
    })

    it('asks for a key when the points fall short', async () => {
      recordAll()
      wallet.checkAccess.mockResolvedValue({ balance: 2, subscription: null })
      renderReview()

      await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }))
      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText('Bạn chưa đủ point để chấm bài')).toBeInTheDocument()
      expect(within(dialog).getByText(`${SERVER_TERMS.pointCost - 2} point`)).toBeInTheDocument()

      await userEvent.click(within(dialog).getByRole('button', { name: /Nạp Key/ }))
      expect(await screen.findByText('Kích hoạt Gói / Nạp Key')).toBeInTheDocument()
    })
  })

  it('drops the recordings and leaves for the catalog on "Thoát"', async () => {
    saveRecording('pv', `${PART_1}-q0`, recording(12))
    renderReview()

    await userEvent.click(await screen.findByRole('button', { name: /Thoát/ }))

    expect(getRecording('pv', `${PART_1}-q0`)).toBeNull()
    expect(screen.getByText('Danh mục luyện tập')).toBeInTheDocument()
  })

  it('goes to the catalog when the address names no part', () => {
    renderReview('/practice/speaking/review/pv')

    expect(screen.getByText('Danh mục luyện tập')).toBeInTheDocument()
  })

  it('warns before the page is closed while there are recordings', async () => {
    saveRecording('pv', `${PART_1}-q0`, recording(12))
    renderReview()
    await screen.findByRole('heading', { name: 'Xem lại bài Speaking của bạn' })

    const event = new Event('beforeunload', { cancelable: true })
    act(() => { window.dispatchEvent(event) })

    expect(event.defaultPrevented).toBe(true)
  })

  it('shows one row per question inside its part', async () => {
    renderReview()

    const part2 = await screen.findByRole('region', { name: 'Part 2' })
    expect(within(part2).getAllByRole('listitem')).toHaveLength(1)
    expect(within(screen.getByRole('region', { name: 'Part 1' })).getAllByRole('listitem')).toHaveLength(2)
  })
})
