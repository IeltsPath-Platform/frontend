import { useEffect, useRef, useState } from 'react'

export type MicState = 'idle' | 'recording' | 'recorded' | 'unavailable'

/**
 * Records the microphone in the browser. The backend stores only a reference to a recording (there is no upload yet),
 * so the audio is kept as a local object URL for playback.
 */
export function useMicRecorder() {
  const [state, setState] = useState<MicState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<number | null>(null)
  const startedAt = useRef(0)
  const chunks = useRef<Blob[]>([])
  const onStopped = useRef<((length: number) => void) | null>(null)
  const urlRef = useRef<string | null>(null)

  function clearTimer() {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
  }

  function releaseUrl() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }

  useEffect(() => () => {
    clearTimer()
    stream.current?.getTracks().forEach((track) => track.stop())
    releaseUrl()
  }, [])

  /** @param maxSeconds stops on its own after this long. @returns false when the microphone cannot be used. */
  async function start(maxSeconds: number, whenStopped?: (length: number) => void): Promise<boolean> {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unavailable')
      return false
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setState('unavailable')
      return false
    }
    releaseUrl()
    setAudioUrl(null)
    chunks.current = []
    onStopped.current = whenStopped ?? null
    const next = new MediaRecorder(stream.current)
    next.ondataavailable = (event) => { if (event.data.size > 0) chunks.current.push(event.data) }
    next.onstop = () => {
      clearTimer()
      stream.current?.getTracks().forEach((track) => track.stop())
      const length = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
      urlRef.current = URL.createObjectURL(new Blob(chunks.current, { type: next.mimeType || 'audio/webm' }))
      setAudioUrl(urlRef.current)
      setSeconds(length)
      setState('recorded')
      onStopped.current?.(length)
    }
    recorder.current = next
    startedAt.current = Date.now()
    setSeconds(0)
    timer.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000)
      setSeconds(elapsed)
      if (elapsed >= maxSeconds) stop()
    }, 250)
    next.start()
    setState('recording')
    return true
  }

  function stop() {
    clearTimer()
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }

  function reset() {
    clearTimer()
    const active = recorder.current
    if (active?.state === 'recording') {
      // Discard: release the microphone without turning this take into a recording.
      active.onstop = () => stream.current?.getTracks().forEach((track) => track.stop())
      active.stop()
    }
    releaseUrl()
    setAudioUrl(null)
    setSeconds(0)
    setState((current) => (current === 'unavailable' ? current : 'idle'))
  }

  return { state, seconds, audioUrl, start, stop, reset }
}
