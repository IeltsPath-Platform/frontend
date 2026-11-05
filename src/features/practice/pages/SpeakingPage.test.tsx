import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SpeakingPage } from './SpeakingPage'
import type { SpeakingTask } from '../speaking/speakingApi'
import { clearSession, getRecording, saveRecording } from '../speaking/speakingSession'

const recorder = vi.hoisted(() => ({
  status: 'idle' as string,
  levels: [] as number[],
  elapsedSeconds: 0,
  recordingUrl: null as string | null,
  isPlayingBack: false,
  silent: false,
  inputName: '',
  inputs: [] as { id: string; label: string; detail: string }[],
  inputId: '',
  errorMessage: '',
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  playRecording: vi.fn(),
  stopPlayback: vi.fn(),
  selectInput: vi.fn(),
}))

/** What the page gave the recorder hook last: the recording to open with and where to report a new one. */
const recorderOptions = vi.hoisted(() => ({ current: undefined as { saved?: unknown; onSaved?: (recording: unknown) => void } | undefined }))

vi.mock('@/components/SiteNavbar', () => ({ SiteNavbar: () => null }))
vi.mock('../hooks/useAudioRecorder', () => ({
  useAudioRecorder: (options?: { saved?: unknown; onSaved?: (recording: unknown) => void }) => {
    recorderOptions.current = options
    return recorder
  },
}))

const task: SpeakingTask = {
  packageId: 'p', packageVersionId: 'pv', sectionId: 's', packageTitle: 'Package', title: 'Part 1: Hometown', partNo: 1,
  timeLimitSeconds: 300, instructions: 'The examiner asks you general questions.',
  questions: [
    { questionVersionId: 'q1', sortOrder: 1, prompt: 'Where is your hometown?', durationSeconds: 45 },
    { questionVersionId: 'q2', sortOrder: 2, prompt: 'What do you like about it?', durationSeconds: 45 },
  ],
}

const onFinish = vi.fn()

function renderPage(nextPartPath: string | null = null, options: { task?: SpeakingTask; initialIndex?: number } = {}) {
  render(
    <MemoryRouter>
      <SpeakingPage task={options.task ?? task} onExit={vi.fn()} onFinish={onFinish} nextPartPath={nextPartPath} initialIndex={options.initialIndex} />
    </MemoryRouter>,
  )
}

const saved = (seconds: number) => ({ blob: new Blob(['x']), durationSeconds: seconds, silent: false, inputName: 'Microphone Array' })

const MICS = [
  { id: 'usb', label: 'USB Microphone', detail: 'Microphone (USB Microphone)' },
  { id: 'realtek', label: 'Microphone Array', detail: 'Microphone Array (Realtek(R) Audio)' },
]

describe('SpeakingPage', () => {
  beforeEach(() => {
    Object.assign(recorder, { status: 'idle', elapsedSeconds: 0, recordingUrl: null, isPlayingBack: false, silent: false, inputName: '', inputs: [], inputId: '', errorMessage: '' })
    recorder.startRecording.mockClear()
    recorder.stopRecording.mockClear()
    recorder.playRecording.mockClear()
    recorder.stopPlayback.mockClear()
    recorder.selectInput.mockClear()
    onFinish.mockClear()
    recorderOptions.current = undefined
    clearSession('pv')
  })

  it('ends the test from the last question with "Hoàn thành"', async () => {
    renderPage()
    expect(screen.queryByRole('button', { name: /Hoàn thành/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Câu sau/ }))
    await userEvent.click(screen.getByRole('button', { name: /Hoàn thành/ }))

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /Câu sau/ })).not.toBeInTheDocument()
  })

  it('ends a part of one question with "Hoàn thành" too', async () => {
    renderPage(null, { task: { ...task, questions: [task.questions[0]] } })

    await userEvent.click(screen.getByRole('button', { name: /Hoàn thành/ }))

    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('leads on to the next part, not to the end, when a part follows', async () => {
    renderPage('/practice/speaking/tasks/pv/next', { initialIndex: 1 })

    expect(screen.getByRole('link', { name: /Sang phần tiếp theo/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hoàn thành/ })).not.toBeInTheDocument()
  })

  it('opens on the question the review sent the learner to', () => {
    renderPage(null, { initialIndex: 1 })

    expect(screen.getByRole('heading', { name: 'What do you like about it?' })).toBeInTheDocument()
    expect(screen.getByText('Question 2 / 2')).toBeInTheDocument()
  })

  it('keeps every finished recording for the whole test', () => {
    renderPage()

    act(() => recorderOptions.current?.onSaved?.(saved(12)))

    expect(getRecording('pv', 'q1')?.durationSeconds).toBe(12)
    expect(getRecording('pv', 'q2')).toBeNull()
  })

  it('gives the recorder back the recording made earlier for the question', async () => {
    saveRecording('pv', 'q1', saved(30))
    renderPage()
    expect(recorderOptions.current?.saved).toMatchObject({ durationSeconds: 30 })

    await userEvent.click(screen.getByRole('button', { name: /Câu sau/ }))

    expect(recorderOptions.current?.saved).toBeNull()
  })

  it('warns before the page is closed while there are recordings', () => {
    const closing = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    renderPage()
    expect(closing()).toBe(false)

    act(() => saveRecording('pv', 'q1', saved(5)))

    expect(closing()).toBe(true)
  })

  it('lets the learner choose the microphone when the computer has several, with short names', async () => {
    recorder.inputs = MICS
    recorder.inputId = 'realtek'
    renderPage()

    const select = screen.getByRole('combobox', { name: 'Micro' })
    expect(select).toHaveValue('realtek')
    expect(screen.getByRole('option', { name: 'Microphone Array' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'USB Microphone' })).toHaveAttribute('title', 'Microphone (USB Microphone)')
    await userEvent.selectOptions(select, 'usb')

    expect(recorder.selectInput).toHaveBeenCalledWith('usb')
  })

  it('shows the microphone the learner chose before, and locks the choice while recording', () => {
    recorder.inputs = MICS
    recorder.inputId = 'realtek'
    recorder.status = 'recording'
    renderPage()

    const select = screen.getByRole('combobox', { name: 'Micro' })
    expect(select).toHaveValue('realtek')
    expect(select).toBeDisabled()
  })

  it('has no microphone choice when there is only one', () => {
    recorder.inputs = [MICS[1]]
    renderPage()

    expect(screen.queryByRole('combobox', { name: 'Micro' })).not.toBeInTheDocument()
  })

  it('points to the microphone box when a silent recording could be fixed by choosing another', () => {
    recorder.status = 'recorded'
    recorder.recordingUrl = 'blob:recording'
    recorder.silent = true
    recorder.inputs = MICS
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('chọn micro khác ở ô “Micro” phía trên')
  })

  it('shows the first question, its progress and the recording studio', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Where is your hometown?' })).toBeInTheDocument()
    expect(screen.getByText('Question 1 / 2')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Câu 1 trên 2' })).toBeInTheDocument()
    expect(screen.getByText('RECORDING STUDIO')).toBeInTheDocument()
    // A question has no time of its own: nothing counts down to a limit.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText(/up to/)).not.toBeInTheDocument()
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  describe('time', () => {
    afterEach(() => { vi.useRealTimers() })

    const short = { ...task, timeLimitSeconds: 3 }

    it('counts down the time of the part in the top bar', () => {
      vi.useFakeTimers()
      renderPage()

      expect(screen.getByRole('timer')).toHaveTextContent('05:00')
      act(() => { vi.advanceTimersByTime(65_000) })
      expect(screen.getByRole('timer')).toHaveTextContent('03:55')
    })

    it('shows no clock for a part without a time', () => {
      renderPage(null, { task: { ...task, timeLimitSeconds: null } })
      expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    })

    it('does not run the clock when a question is opened again from the review', () => {
      render(
        <MemoryRouter>
          <SpeakingPage task={task} timed={false} onExit={vi.fn()} onFinish={onFinish} />
        </MemoryRouter>,
      )
      expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    })

    it('says the time is over, closes recording and still lets the learner move on', () => {
      vi.useFakeTimers()
      renderPage(null, { task: short })
      act(() => { vi.advanceTimersByTime(3000) })

      expect(screen.getByRole('timer')).toHaveTextContent('Hết giờ')
      expect(screen.getByRole('alert')).toHaveTextContent('Đã hết thời gian của phần này')
      expect(screen.getByRole('button', { name: 'Start Recording' })).toBeDisabled()
      expect(screen.getByRole('button', { name: /Câu sau/ })).toBeEnabled()
    })

    it('stops an answer that is still being recorded when the time is over', () => {
      vi.useFakeTimers()
      recorder.status = 'recording'
      recorder.elapsedSeconds = 2
      renderPage(null, { task: short })
      expect(recorder.stopRecording).not.toHaveBeenCalled()

      act(() => { vi.advanceTimersByTime(3000) })

      expect(recorder.stopRecording).toHaveBeenCalled()
    })
  })

  describe('minimum answer time', () => {
    it('keeps Stop closed for the first seconds and says how long to wait', () => {
      recorder.status = 'recording'
      recorder.elapsedSeconds = 2
      renderPage()

      expect(screen.getByRole('status')).toHaveTextContent('Vui lòng đợi 3 giây để hoàn thành')
      expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
    })

    it('has no limit at the other end: a long answer just keeps counting', () => {
      recorder.status = 'recording'
      recorder.elapsedSeconds = 600
      renderPage()

      expect(screen.queryByText(/Vui lòng đợi/)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled()
      expect(screen.getByText('10:00')).toBeInTheDocument()
    })
  })

  it('moves to the next question and back', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /Câu sau/ }))
    expect(screen.getByRole('heading', { name: 'What do you like about it?' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Câu trước/ }))
    expect(screen.getByRole('heading', { name: 'Where is your hometown?' })).toBeInTheDocument()
  })

  it('offers the next part instead of "Câu sau" on the last question', async () => {
    renderPage('/practice/speaking/tasks/pv/next')
    await userEvent.click(screen.getByRole('button', { name: /Câu sau/ }))

    expect(screen.getByRole('link', { name: /Sang phần tiếp theo/ })).toHaveAttribute('href', '/practice/speaking/tasks/pv/next')
    expect(screen.queryByRole('button', { name: /Câu sau/ })).not.toBeInTheDocument()
  })

  it('starts recording from the microphone button', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Start Recording' }))

    expect(recorder.startRecording).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Playback' })).toBeDisabled()
  })

  it('turns the same button into Stop while recording', async () => {
    recorder.status = 'recording'
    recorder.elapsedSeconds = 6
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(recorder.stopRecording).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Đang ghi')).toBeInTheDocument()
  })

  it('records again and plays back once a recording exists', async () => {
    recorder.status = 'recorded'
    recorder.recordingUrl = 'blob:recording'
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Playback' }))
    await userEvent.click(screen.getByRole('button', { name: 'Record again' }))

    expect(recorder.playRecording).toHaveBeenCalledTimes(1)
    expect(recorder.startRecording).toHaveBeenCalledTimes(1)
  })

  it('turns the playback button into a stop button while the recording plays', async () => {
    recorder.status = 'recorded'
    recorder.recordingUrl = 'blob:recording'
    recorder.isPlayingBack = true
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Dừng phát' }))

    expect(recorder.stopPlayback).toHaveBeenCalledTimes(1)
    expect(recorder.playRecording).not.toHaveBeenCalled()
  })

  it('warns when the recording carried no sound and names the microphone that was used', () => {
    recorder.status = 'recorded'
    recorder.recordingUrl = 'blob:recording'
    recorder.silent = true
    recorder.inputName = 'Microphone Array (Realtek(R) Audio)'
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Không thu được tiếng nói')
    expect(screen.getByRole('alert')).toHaveTextContent('Micro trình duyệt đang dùng: Microphone Array (Realtek(R) Audio).')
  })

  it('does not warn about silence for a recording with sound', () => {
    recorder.status = 'recorded'
    recorder.recordingUrl = 'blob:recording'
    renderPage()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('hides the voice controls in a browser that cannot speak', () => {
    renderPage()

    expect(screen.queryByRole('button', { name: 'Nghe câu hỏi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /Tự đọc câu hỏi/ })).not.toBeInTheDocument()
  })
})

describe('SpeakingPage examiner voice', () => {
  class FakeUtterance {
    text: string
    lang = ''
    rate = 1
    voice: unknown = null
    onstart: (() => void) | null = null
    onend: (() => void) | null = null
    onerror: ((event: { error: string }) => void) | null = null
    constructor(text: string) {
      this.text = text
    }
  }
  const speak = vi.fn<(utterance: FakeUtterance) => void>()
  const cancel = vi.fn()
  const lastUtterance = () => speak.mock.calls[speak.mock.calls.length - 1][0]

  beforeEach(() => {
    Object.assign(recorder, { status: 'idle', elapsedSeconds: 0, recordingUrl: null, isPlayingBack: false, silent: false, inputName: '', inputs: [], inputId: '', errorMessage: '' })
    recorder.startRecording.mockClear()
    speak.mockClear()
    cancel.mockClear()
    window.localStorage.clear()
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel, getVoices: () => [], addEventListener: vi.fn(), removeEventListener: vi.fn() },
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'speechSynthesis')
    vi.unstubAllGlobals()
  })

  it('reads the first question aloud as soon as it appears', async () => {
    renderPage()

    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1))
    expect(lastUtterance().text).toBe('Where is your hometown?')
    expect(lastUtterance().rate).toBeLessThan(1)
  })

  it('reads the next question when the learner moves on, and silences the old one', async () => {
    renderPage()
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1))
    cancel.mockClear()

    await userEvent.click(screen.getByRole('button', { name: /Câu sau/ }))

    expect(cancel).toHaveBeenCalled()
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(2))
    expect(lastUtterance().text).toBe('What do you like about it?')
  })

  it('reads the question again from the button', async () => {
    renderPage()
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1))

    await userEvent.click(screen.getByRole('button', { name: 'Nghe câu hỏi' }))

    expect(speak).toHaveBeenCalledTimes(2)
    expect(lastUtterance().text).toBe('Where is your hometown?')
  })

  it('offers to stop while the voice is speaking', async () => {
    renderPage()
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1))
    act(() => lastUtterance().onstart?.())
    cancel.mockClear()

    await userEvent.click(screen.getByRole('button', { name: 'Dừng đọc' }))

    expect(cancel).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Nghe câu hỏi' })).toBeInTheDocument()
  })

  it('silences the voice before the microphone opens so the question is not recorded', async () => {
    renderPage()
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1))
    cancel.mockClear()

    await userEvent.click(screen.getByRole('button', { name: 'Start Recording' }))

    expect(cancel).toHaveBeenCalled()
    expect(recorder.startRecording).toHaveBeenCalledTimes(1)
  })

  it('remembers that the learner turned automatic reading off', async () => {
    renderPage()
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1))

    await userEvent.click(screen.getByRole('switch', { name: /Tự đọc câu hỏi/ }))
    await userEvent.click(screen.getByRole('button', { name: /Câu sau/ }))
    await new Promise((resolve) => setTimeout(resolve, 450))

    expect(screen.getByRole('switch', { name: /Tự đọc câu hỏi/ })).toHaveAttribute('aria-checked', 'false')
    expect(window.localStorage.getItem('practice.speaking.autoRead')).toBe('off')
    expect(speak).toHaveBeenCalledTimes(1)
  })

  it('does not read by itself when the learner turned it off earlier, but still reads on request', async () => {
    window.localStorage.setItem('practice.speaking.autoRead', 'off')
    renderPage()
    await new Promise((resolve) => setTimeout(resolve, 450))
    expect(speak).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Nghe câu hỏi' }))

    expect(speak).toHaveBeenCalledTimes(1)
  })

  it('tells the learner when the browser blocks a voice they did not ask for', async () => {
    renderPage()
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1))

    act(() => lastUtterance().onerror?.({ error: 'not-allowed' }))

    expect(screen.getByRole('status')).toHaveTextContent('Bấm “Nghe câu hỏi” để nghe')
  })
})
