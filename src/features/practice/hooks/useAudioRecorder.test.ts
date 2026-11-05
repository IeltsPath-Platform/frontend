import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAudioRecorder } from './useAudioRecorder'

/** How loud the fake microphone is, 0 to 255 in every frequency bin. */
let loudness = 200

class FakeRecorder {
  state = 'inactive'
  mimeType = 'audio/webm'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  start() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['audio']) })
    this.onstop?.()
  }
}

class FakeAudioContext {
  state = 'running'
  createAnalyser() {
    return { fftSize: 0, frequencyBinCount: 128, getByteFrequencyData: (data: Uint8Array) => { data.fill(loudness) } }
  }
  createMediaStreamSource() { return { connect: () => undefined } }
  close() { this.state = 'closed'; return Promise.resolve() }
}

function microphone(label: string) {
  const track = { label, stop: vi.fn() }
  return { getTracks: () => [track], getAudioTracks: () => [track] }
}

/** The computer of a learner whose remote-desktop tool made its virtual microphone the system default. */
const DEVICES = [
  { kind: 'audioinput', deviceId: 'default', label: 'Default - Microphone (DeskIn(R) Virtual Audio Device)' },
  { kind: 'audioinput', deviceId: 'communications', label: 'Communications - Microphone (DeskIn(R) Virtual Audio Device)' },
  { kind: 'audioinput', deviceId: 'deskin', label: 'Microphone (DeskIn(R) Virtual Audio Device)' },
  { kind: 'audioinput', deviceId: 'rapoo', label: 'Microphone (Rapoo Gaming Headset)' },
  { kind: 'audioinput', deviceId: 'realtek', label: 'Microphone Array (Realtek(R) Audio)' },
  { kind: 'audioinput', deviceId: 'usb', label: 'Microphone (USB Microphone)' },
  { kind: 'videoinput', deviceId: 'camera', label: 'Camera' },
]

function setDevices(devices: unknown[]) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia,
      enumerateDevices: async () => devices,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  })
}

const getUserMedia = vi.fn()

describe('useAudioRecorder', () => {
  beforeEach(() => {
    loudness = 200
    window.localStorage.clear()
    getUserMedia.mockReset()
    getUserMedia.mockImplementation(async () => microphone('Microphone Array (Realtek(R) Audio)'))
    vi.stubGlobal('MediaRecorder', FakeRecorder)
    vi.stubGlobal('AudioContext', FakeAudioContext)
    URL.createObjectURL = vi.fn(() => 'blob:recording')
    URL.revokeObjectURL = vi.fn()
    setDevices(DEVICES)
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'mediaDevices')
    vi.unstubAllGlobals()
  })

  it('lists only the microphones of the computer, with short names', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await waitFor(() => expect(result.current.inputs).toHaveLength(2))
    // No camera, no browser "default" or "communications" copy, no virtual microphone and no headset.
    expect(result.current.inputs).toEqual([
      { id: 'realtek', label: 'Microphone Array', detail: 'Microphone Array (Realtek(R) Audio)' },
      { id: 'usb', label: 'USB Microphone', detail: 'Microphone (USB Microphone)' },
    ])
  })

  it('records from the microphone built into the computer, not from the virtual device the system made the default', async () => {
    const { result } = renderHook(() => useAudioRecorder())
    await waitFor(() => expect(result.current.inputId).toBe('realtek'))

    await act(async () => { await result.current.startRecording() })

    expect(getUserMedia).toHaveBeenCalledWith({ audio: { deviceId: { exact: 'realtek' } } })
    // Only a deliberate choice is remembered.
    expect(window.localStorage.getItem('practice.speaking.micId')).toBeNull()
  })

  it('lists a headset or virtual microphone when it is all the computer has, so the learner is never stuck', async () => {
    setDevices([
      { kind: 'audioinput', deviceId: 'default', label: 'Default - Microphone (Rapoo Gaming Headset)' },
      { kind: 'audioinput', deviceId: 'rapoo', label: 'Microphone (Rapoo Gaming Headset)' },
    ])
    const { result } = renderHook(() => useAudioRecorder())

    await waitFor(() => expect(result.current.inputs).toHaveLength(1))
    expect(result.current.inputs[0]).toMatchObject({ id: 'rapoo', label: 'Rapoo Gaming Headset' })
    expect(result.current.inputId).toBe('rapoo')
  })

  it('lets the browser decide while the microphones have no names yet', async () => {
    setDevices([{ kind: 'audioinput', deviceId: 'abc', label: '' }, { kind: 'audioinput', deviceId: 'def', label: '' }])
    const { result } = renderHook(() => useAudioRecorder())
    await waitFor(() => expect(result.current.inputs).toHaveLength(2))

    await act(async () => { await result.current.startRecording() })

    expect(result.current.inputId).toBe('')
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
  })

  it('records from the microphone the learner chose and remembers the choice', async () => {
    const { result, unmount } = renderHook(() => useAudioRecorder())
    await waitFor(() => expect(result.current.inputs).toHaveLength(2))
    act(() => result.current.selectInput('usb'))

    await act(async () => { await result.current.startRecording() })

    expect(getUserMedia).toHaveBeenCalledWith({ audio: { deviceId: { exact: 'usb' } } })
    expect(window.localStorage.getItem('practice.speaking.micId')).toBe('usb')
    unmount()

    const next = renderHook(() => useAudioRecorder())
    await waitFor(() => expect(next.result.current.inputId).toBe('usb'))
  })

  it('goes back to the built-in microphone when the one chosen before is no longer listed', async () => {
    window.localStorage.setItem('practice.speaking.micId', 'unplugged')
    const { result } = renderHook(() => useAudioRecorder())

    await waitFor(() => expect(result.current.inputId).toBe('realtek'))
  })

  it('falls back to the browser default when the opened microphone has just gone', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('gone', 'OverconstrainedError'))
    const { result } = renderHook(() => useAudioRecorder())
    await waitFor(() => expect(result.current.inputId).toBe('realtek'))

    await act(async () => { await result.current.startRecording() })

    expect(getUserMedia).toHaveBeenNthCalledWith(1, { audio: { deviceId: { exact: 'realtek' } } })
    expect(getUserMedia).toHaveBeenNthCalledWith(2, { audio: true })
    expect(result.current.status).toBe('recording')
  })

  it('reports a denied microphone instead of falling back', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    const { result } = renderHook(() => useAudioRecorder())
    await waitFor(() => expect(result.current.inputId).toBe('realtek'))

    await act(async () => { await result.current.startRecording() })

    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toContain('microphone')
  })

  it('flags a recording that carried no sound', async () => {
    loudness = 0
    const { result } = renderHook(() => useAudioRecorder())
    await act(async () => { await result.current.startRecording() })

    act(() => { void result.current.stopRecording() })

    expect(result.current.status).toBe('recorded')
    expect(result.current.silent).toBe(true)
  })

  it('hands every finished recording to the caller so it can be kept', async () => {
    const onSaved = vi.fn()
    const { result } = renderHook(() => useAudioRecorder({ onSaved }))
    await act(async () => { await result.current.startRecording() })

    act(() => { void result.current.stopRecording() })

    expect(onSaved).toHaveBeenCalledTimes(1)
    const [saved] = onSaved.mock.calls[0]
    expect(saved.blob).toBeInstanceOf(Blob)
    expect(saved).toMatchObject({ silent: false, inputName: 'Microphone Array (Realtek(R) Audio)' })
    expect(typeof saved.durationSeconds).toBe('number')
  })

  it('opens ready to play when the question was recorded before', () => {
    const saved = { blob: new Blob(['audio']), durationSeconds: 14, silent: true, inputName: 'Microphone Array' }
    const { result } = renderHook(() => useAudioRecorder({ saved }))

    expect(result.current.status).toBe('recorded')
    expect(result.current.recordingUrl).toBe('blob:recording')
    expect(result.current.elapsedSeconds).toBe(14)
    expect(result.current.silent).toBe(true)
    expect(result.current.inputName).toBe('Microphone Array')
  })

  it('does not report a recording it only restored', () => {
    const onSaved = vi.fn()
    const saved = { blob: new Blob(['audio']), durationSeconds: 14, silent: false, inputName: 'Microphone Array' }
    renderHook(() => useAudioRecorder({ saved, onSaved }))

    expect(onSaved).not.toHaveBeenCalled()
  })

  it('does not flag a recording that has sound', async () => {
    const { result } = renderHook(() => useAudioRecorder())
    await act(async () => { await result.current.startRecording() })

    act(() => { void result.current.stopRecording() })

    expect(result.current.status).toBe('recorded')
    expect(result.current.silent).toBe(false)
  })
})
