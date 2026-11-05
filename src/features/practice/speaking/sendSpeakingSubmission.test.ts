import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordingMissingError, RecordingTooLongError, maxSecondsFor, sendSpeakingSubmission } from './sendSpeakingSubmission'
import type { RecordingToSend } from './sendSpeakingSubmission'
import type { SpeakingSubmission, SpeakingSubmissionRecording } from './speakingPracticeApi'

const api = vi.hoisted(() => ({
  createSpeakingSubmission: vi.fn(),
  uploadSpeakingRecording: vi.fn(),
  completeSpeakingSubmission: vi.fn(),
}))
const wav = vi.hoisted(() => ({ toWav16kMono: vi.fn() }))

vi.mock('./speakingPracticeApi', () => api)
vi.mock('./wavEncoder', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./wavEncoder')>()),
  toWav16kMono: wav.toWav16kMono,
}))

const FIVE_MB = 5 * 1024 * 1024

const recording = (questionVersionId: string, seconds = 10): RecordingToSend => ({
  questionVersionId, label: `Câu ${questionVersionId}`,
  recording: { blob: new Blob([questionVersionId]), durationSeconds: seconds, silent: false, inputName: 'mic' },
})

const slot = (questionVersionId: string, uploaded = false): SpeakingSubmissionRecording => ({
  questionVersionId, sectionId: 's', partNo: 1, questionNo: 1, uploaded, durationMs: null,
})

const submission = (...recordings: SpeakingSubmissionRecording[]): SpeakingSubmission => ({
  id: 'sub-1', packageVersionId: 'pv', scope: 'FULL', status: 'UPLOADING', pointCost: 5, failureCode: null,
  createdAt: '2026-11-04T05:00:00Z', recordings,
})

const send = (recordings: RecordingToSend[], onProgress?: (p: { done: number; total: number }) => void) =>
  sendSpeakingSubmission({ requestId: 'req-1', packageVersionId: 'pv', partSectionIds: ['s'], recordings, maxRecordingBytes: FIVE_MB, onProgress })

describe('sendSpeakingSubmission', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    wav.toWav16kMono.mockReset()
    wav.toWav16kMono.mockImplementation(async (blob: Blob) => new Blob([`wav:${await blob.text?.()}`], { type: 'audio/wav' }))
    api.completeSpeakingSubmission.mockResolvedValue({ ...submission(), status: 'QUEUED' })
    api.uploadSpeakingRecording.mockImplementation(async () => submission())
  })

  it('opens the submission, stores each answer as WAV in order, then completes it', async () => {
    api.createSpeakingSubmission.mockResolvedValue(submission(slot('a'), slot('b')))
    const order: string[] = []
    api.uploadSpeakingRecording.mockImplementation(async (_id: string, question: string) => { order.push(question); return submission() })
    const progress: Array<[number, number]> = []

    const result = await send([recording('b'), recording('a')], (p) => progress.push([p.done, p.total]))

    expect(api.createSpeakingSubmission).toHaveBeenCalledWith({ requestId: 'req-1', packageVersionId: 'pv', partSectionIds: ['s'], consent: true })
    expect(order).toEqual(['a', 'b'])
    expect(api.uploadSpeakingRecording.mock.calls[0][0]).toBe('sub-1')
    expect((api.uploadSpeakingRecording.mock.calls[0][2] as Blob).type).toBe('audio/wav')
    expect(api.uploadSpeakingRecording.mock.calls[0][3]).toBe(10_000)
    expect(api.completeSpeakingSubmission).toHaveBeenCalledWith('sub-1')
    expect(result.status).toBe('QUEUED')
    expect(progress).toEqual([[0, 2], [1, 2], [2, 2]])
  })

  it('skips what the server already has, so sending again after a failure continues', async () => {
    api.createSpeakingSubmission.mockResolvedValue(submission(slot('a', true), slot('b')))

    await send([recording('a'), recording('b')])

    expect(api.uploadSpeakingRecording).toHaveBeenCalledTimes(1)
    expect(api.uploadSpeakingRecording.mock.calls[0][1]).toBe('b')
    expect(api.completeSpeakingSubmission).toHaveBeenCalled()
  })

  it('stores nothing and does not complete when the points are short', async () => {
    api.createSpeakingSubmission.mockRejectedValue(new Error('402'))

    await expect(send([recording('a')])).rejects.toThrow('402')

    expect(api.uploadSpeakingRecording).not.toHaveBeenCalled()
    expect(api.completeSpeakingSubmission).not.toHaveBeenCalled()
  })

  it('refuses an answer too long to store before it opens anything', async () => {
    await expect(send([recording('a', 10), recording('b', 200)])).rejects.toBeInstanceOf(RecordingTooLongError)

    expect(api.createSpeakingSubmission).not.toHaveBeenCalled()
  })

  it('also checks the size of the file that was actually written', async () => {
    api.createSpeakingSubmission.mockResolvedValue(submission(slot('a')))
    wav.toWav16kMono.mockResolvedValue({ size: FIVE_MB + 1, type: 'audio/wav' } as Blob)

    await expect(send([recording('a', 10)])).rejects.toBeInstanceOf(RecordingTooLongError)

    expect(api.uploadSpeakingRecording).not.toHaveBeenCalled()
  })

  it('does not complete when a recording cannot be stored', async () => {
    api.createSpeakingSubmission.mockResolvedValue(submission(slot('a'), slot('b')))
    api.uploadSpeakingRecording.mockRejectedValueOnce(new Error('offline'))

    await expect(send([recording('a'), recording('b')])).rejects.toThrow('offline')

    expect(api.completeSpeakingSubmission).not.toHaveBeenCalled()
  })

  it('reports a question the server expects but the browser no longer has', async () => {
    api.createSpeakingSubmission.mockResolvedValue(submission(slot('a'), slot('missing')))

    await expect(send([recording('a')])).rejects.toBeInstanceOf(RecordingMissingError)

    expect(api.completeSpeakingSubmission).not.toHaveBeenCalled()
  })
})

describe('maxSecondsFor', () => {
  it('is about two and a half minutes for five megabytes', () => {
    expect(maxSecondsFor(FIVE_MB)).toBe(163)
  })
})
