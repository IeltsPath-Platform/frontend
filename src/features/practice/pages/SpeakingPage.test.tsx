import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SpeakingPage } from './SpeakingPage'
import type { SpeakingTask } from '../speaking/speakingApi'

const recorder = vi.hoisted(() => ({
  status: 'idle' as string,
  levels: [] as number[],
  elapsedSeconds: 0,
  recordingUrl: null as string | null,
  isPlayingBack: false,
  errorMessage: '',
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  playRecording: vi.fn(),
}))

vi.mock('@/components/SiteNavbar', () => ({ SiteNavbar: () => null }))
vi.mock('../hooks/useAudioRecorder', () => ({ useAudioRecorder: () => recorder }))

const task: SpeakingTask = {
  packageId: 'p', packageVersionId: 'pv', sectionId: 's', packageTitle: 'Package', title: 'Part 1: Hometown', partNo: 1,
  timeLimitSeconds: 300, instructions: 'The examiner asks you general questions.',
  questions: [
    { questionVersionId: 'q1', sortOrder: 1, prompt: 'Where is your hometown?', durationSeconds: 45 },
    { questionVersionId: 'q2', sortOrder: 2, prompt: 'What do you like about it?', durationSeconds: 45 },
  ],
}

function renderPage(nextPartPath: string | null = null) {
  render(<MemoryRouter><SpeakingPage task={task} onExit={vi.fn()} nextPartPath={nextPartPath} /></MemoryRouter>)
}

describe('SpeakingPage', () => {
  beforeEach(() => {
    Object.assign(recorder, { status: 'idle', elapsedSeconds: 0, recordingUrl: null, isPlayingBack: false, errorMessage: '' })
    recorder.startRecording.mockClear()
    recorder.stopRecording.mockClear()
    recorder.playRecording.mockClear()
  })

  it('shows the first question, its progress and the recording studio', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Where is your hometown?' })).toBeInTheDocument()
    expect(screen.getByText('Question 1 / 2')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Câu 1 trên 2' })).toBeInTheDocument()
    expect(screen.getByText('RECORDING STUDIO')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Thời gian nói đã dùng' })).toBeInTheDocument()
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
})
