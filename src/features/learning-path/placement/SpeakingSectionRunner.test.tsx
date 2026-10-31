import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SectionRunnerProps } from './PlacementExamShell'
import { SpeakingSectionRunner } from './SpeakingSectionRunner'

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  submit: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  reset: vi.fn(),
  onStopped: null as ((length: number, recording: Blob) => void) | null,
  recorderState: 'idle' as 'idle' | 'recording' | 'recorded',
}))

vi.mock('./useMicRecorder', () => ({
  useMicRecorder: () => ({
    state: mocks.recorderState,
    seconds: 0,
    audioUrl: null,
    start: mocks.start,
    stop: mocks.stop,
    reset: mocks.reset,
  }),
}))

vi.mock('./speakingRecordingApi', () => ({ uploadSpeakingRecording: mocks.upload }))
vi.mock('../api', () => ({
  learningApi: { submitLearnerSubmission: mocks.submit },
  toApiError: (reason: unknown) => ({ message: reason instanceof Error ? reason.message : 'Failed' }),
}))
vi.mock('../lib/reviewGate', () => ({ reportApiError: vi.fn() }))

const recording = new Blob(['audio'], { type: 'audio/webm' })
const item = { id: 'item-1', sortOrder: 0, question: { number: 1, prompt: 'Tell me about your home.' } }
const props = {
  attemptId: 'attempt-1',
  group: {
    id: 'section-1', skill: 'SPEAKING',
    sections: [{ id: 'section-1', sortOrder: 0, partNo: 1,
      snapshot: { skill: 'SPEAKING', title: 'Part 1', instructions: null }, items: [item], startedAt: null, completedAt: null }],
  },
  answers: { 'item-1': '{"spokenSeconds":3}' }, saveStates: {}, setAnswer: vi.fn(), saveAnswer: vi.fn().mockResolvedValue(true),
  onOpenPart: vi.fn(), onExit: vi.fn(), onComplete: vi.fn().mockResolvedValue(undefined),
} as unknown as SectionRunnerProps

describe('SpeakingSectionRunner', () => {
  beforeEach(() => {
    mocks.upload.mockReset()
    mocks.submit.mockReset().mockResolvedValue({ id: 'submission-1' })
    mocks.start.mockReset().mockImplementation(async (_seconds: number, onStopped: typeof mocks.onStopped) => {
      mocks.recorderState = 'recording'
      mocks.onStopped = onStopped
      return true
    })
    mocks.stop.mockReset().mockImplementation(() => {
      mocks.recorderState = 'recorded'
      mocks.onStopped?.(3, recording)
    })
    mocks.reset.mockReset()
    mocks.onStopped = null
    vi.mocked(props.onComplete).mockClear()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:take') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('keeps the take after upload failure and submits the returned storage reference on retry', async () => {
    mocks.upload.mockRejectedValueOnce(new Error('network')).mockResolvedValue({
      mediaReference: 'speaking/user/recording.webm', contentType: 'audio/webm', sizeBytes: 5,
    })
    render(<SpeakingSectionRunner {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua' }))
    await new Promise((resolve) => window.setTimeout(resolve, 3100))
    await waitFor(() => expect(mocks.start).toHaveBeenCalled())
    act(() => { mocks.stop() })
    await screen.findByRole('heading', { name: 'Nghe lại bài nói của bạn' })

    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' }))
    await screen.findByRole('alert')
    expect(mocks.submit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' }))
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({
      audioReference: 'speaking/user/recording.webm', skill: 'SPEAKING',
    })))
    expect(mocks.upload).toHaveBeenCalledTimes(2)
    expect(props.onComplete).toHaveBeenCalledTimes(1)
  }, 10000)
})
