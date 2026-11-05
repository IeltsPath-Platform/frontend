import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { clearSession, getRecording, hasUnsentRecordings, saveRecording, useSessionRecordings } from './speakingSession'
import type { SavedRecording } from './speakingSession'

const recording = (seconds: number): SavedRecording => ({ blob: new Blob(['x']), durationSeconds: seconds, silent: false, inputName: 'Microphone Array' })

describe('speaking session', () => {
  afterEach(() => {
    clearSession('test-a')
    clearSession('test-b')
  })

  it('keeps a recording by test and question', () => {
    saveRecording('test-a', 'q1', recording(12))

    expect(getRecording('test-a', 'q1')?.durationSeconds).toBe(12)
    expect(getRecording('test-a', 'q2')).toBeNull()
    expect(getRecording('test-b', 'q1')).toBeNull()
  })

  it('replaces the recording when a question is recorded again', () => {
    saveRecording('test-a', 'q1', recording(12))
    saveRecording('test-a', 'q1', recording(30))

    expect(getRecording('test-a', 'q1')?.durationSeconds).toBe(30)
  })

  it('tells a component when a recording is added or the session is cleared', () => {
    const { result } = renderHook(() => useSessionRecordings('test-a'))
    expect(result.current.size).toBe(0)

    act(() => saveRecording('test-a', 'q1', recording(5)))
    expect(result.current.size).toBe(1)
    expect(hasUnsentRecordings()).toBe(true)

    act(() => clearSession('test-a'))
    expect(result.current.size).toBe(0)
    expect(hasUnsentRecordings()).toBe(false)
  })

  it('keeps the tests apart', () => {
    saveRecording('test-a', 'q1', recording(5))
    const { result } = renderHook(() => useSessionRecordings('test-b'))

    expect(result.current.size).toBe(0)
  })
})
