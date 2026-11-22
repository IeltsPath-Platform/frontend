import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  beginSpeakingTiming, finishSpeakingTiming, markSpeakingGradeReady, markSpeakingTiming, noteSpeakingPoll,
} from './speakingTiming'

/** The marks read the clock in this order, so each call gets the next time. */
function clock(...times: number[]) {
  const queue = [...times]
  vi.spyOn(performance, 'now').mockImplementation(() => queue.shift() ?? times[times.length - 1])
}

describe('speakingTiming', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('splits the wait into the pieces the learner lives through and writes one line for the submission', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    // opened, uploaded, completed, ready, released
    clock(1500, 9500, 9800, 31800, 33000)

    beginSpeakingTiming('s1', 1000, 3)
    noteSpeakingPoll('s1')
    noteSpeakingPoll('s1')
    markSpeakingTiming('s1', 'uploaded')
    markSpeakingTiming('s1', 'completed')
    markSpeakingGradeReady('s1')
    markSpeakingGradeReady('s1')
    const summary = finishSpeakingTiming('s1')

    expect(summary).toEqual({
      submissionId: 's1', recordings: 3, openMs: 500, uploadMs: 8000, completeMs: 300, gradingMs: 22000, releaseMs: 1200,
      totalMs: 32000, polls: 2,
    })
    expect(info).toHaveBeenCalledTimes(1)
    expect(String(info.mock.calls[0][0])).toMatch(/^\[speaking-timing\] \{.*"totalMs":32000.*\}$/)
  })

  it('writes the line once: a second finish, or a submission this page did not send, writes nothing', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    clock(100, 200, 300, 400, 500, 600)
    beginSpeakingTiming('s2', 0, 1)
    markSpeakingTiming('s2', 'uploaded')
    markSpeakingTiming('s2', 'completed')
    expect(finishSpeakingTiming('s2')).not.toBeNull()

    expect(finishSpeakingTiming('s2')).toBeNull()
    expect(finishSpeakingTiming('never-sent')).toBeNull()
    expect(info).toHaveBeenCalledTimes(1)
  })

  it('counts a grade first seen already released as ready at the moment it is shown', () => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    clock(100, 200, 300, 1300)
    beginSpeakingTiming('s3', 0, 1)
    markSpeakingTiming('s3', 'uploaded')
    markSpeakingTiming('s3', 'completed')

    const summary = finishSpeakingTiming('s3')

    expect(summary?.gradingMs).toBe(1000)
    expect(summary?.releaseMs).toBe(0)
  })

  it('leaves out a piece that was never marked instead of inventing it', () => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    clock(100, 400)
    beginSpeakingTiming('s4', 0, 2)

    const summary = finishSpeakingTiming('s4')

    expect(summary).toMatchObject({ openMs: 100, uploadMs: null, completeMs: null, gradingMs: null })
  })
})
