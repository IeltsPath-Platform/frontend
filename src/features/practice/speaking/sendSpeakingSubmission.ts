import {
  completeSpeakingSubmission, createLessonSpeakingSubmission, createSpeakingSubmission, uploadSpeakingRecording,
} from './speakingPracticeApi'
import type { SpeakingSubmission } from './speakingPracticeApi'
import type { SavedRecording } from './speakingSession'
import { toWav16kMono, wavBytesFor } from './wavEncoder'

/** An answer is too long to send: its WAV would pass the size the server accepts for one question. */
export class RecordingTooLongError extends Error {
  readonly label: string
  readonly maxSeconds: number

  constructor(label: string, maxSeconds: number) {
    super(`${label} dài quá giới hạn (tối đa khoảng ${Math.floor(maxSeconds / 60)} phút ${Math.floor(maxSeconds % 60)} giây). Hãy ghi lại ngắn hơn.`)
    this.name = 'RecordingTooLongError'
    this.label = label
    this.maxSeconds = maxSeconds
  }
}

/** The server wants a recording the learner does not have in this browser (the test changed, or the page was reloaded). */
export class RecordingMissingError extends Error {
  constructor() {
    super('Thiếu bản ghi của một câu hỏi. Hãy quay lại ghi âm câu đó.')
    this.name = 'RecordingMissingError'
  }
}

export interface RecordingToSend {
  questionVersionId: string
  /** How the learner knows the question, such as "Part 1, câu 2"; used in the error for an answer that is too long. */
  label: string
  recording: SavedRecording
}

export interface SendProgress {
  done: number
  total: number
}

/** Seconds of 16 kHz mono WAV that fit in {@code maxBytes}. */
export function maxSecondsFor(maxBytes: number): number {
  return Math.floor((maxBytes - 44) / (16000 * 2))
}

/**
 * Sends the learner's answers for grading: opens the submission (the server checks the points first, so nothing is stored
 * when they are short), converts each recording to WAV and stores it, then completes the submission. Sending again with
 * the same {@code requestId} after a failure continues the same submission and skips what is already stored.
 */
export async function sendSpeakingSubmission(input: {
  requestId: string
  /** A practice test of the catalog; leave out for the answer of a lesson's practice attempt (`attemptId`). */
  packageVersionId?: string
  partSectionIds?: string[]
  /** The lesson's practice attempt the answer belongs to; its grade then counts toward mastery. */
  attemptId?: string
  recordings: RecordingToSend[]
  maxRecordingBytes: number
  onProgress?: (progress: SendProgress) => void
}): Promise<SpeakingSubmission> {
  // An answer that cannot be stored is found before the submission is opened, not after the others were uploaded.
  for (const item of input.recordings) {
    if (wavBytesFor(item.recording.durationSeconds) > input.maxRecordingBytes) {
      throw new RecordingTooLongError(item.label, maxSecondsFor(input.maxRecordingBytes))
    }
  }

  let submission = input.attemptId
    ? await createLessonSpeakingSubmission(input.attemptId, { requestId: input.requestId, consent: true })
    : await createSpeakingSubmission({
      requestId: input.requestId, packageVersionId: input.packageVersionId ?? '', partSectionIds: input.partSectionIds ?? [],
      consent: true,
    })
  const pending = submission.recordings.filter((recording) => !recording.uploaded)
  const total = submission.recordings.length
  let done = total - pending.length
  input.onProgress?.({ done, total })

  for (const wanted of pending) {
    const item = input.recordings.find((candidate) => candidate.questionVersionId === wanted.questionVersionId)
    if (!item) throw new RecordingMissingError()
    const wav = await toWav16kMono(item.recording.blob)
    // The header sizes are estimates for the check above; the file itself is what the server limits.
    if (wav.size > input.maxRecordingBytes) throw new RecordingTooLongError(item.label, maxSecondsFor(input.maxRecordingBytes))
    submission = await uploadSpeakingRecording(submission.id, wanted.questionVersionId, wav, item.recording.durationSeconds * 1000)
    done += 1
    input.onProgress?.({ done, total })
  }
  return completeSpeakingSubmission(submission.id)
}
