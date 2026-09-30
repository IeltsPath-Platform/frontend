import { useCallback, useEffect, useRef, useState } from 'react'

const BAR_COUNT = 28
const INITIAL_LEVELS = Array.from({ length: BAR_COUNT }, (_, index) => .16 + (index % 5) * .05)

export function useAudioRecorder() {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording' | 'processing' | 'recorded' | 'error'>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [levels, setLevels] = useState<number[]>(INITIAL_LEVELS)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isPlayingBack, setIsPlayingBack] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const animationFrame = useRef<number | null>(null)
  const audioPlayer = useRef<HTMLAudioElement | null>(null)
  const url = useRef<string | null>(null)

  const stopVisualizer = useCallback(() => {
    if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current)
    animationFrame.current = null
    setLevels(INITIAL_LEVELS)
  }, [])

  const releaseMedia = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (audioContext.current && audioContext.current.state !== 'closed') void audioContext.current.close()
    audioContext.current = null
  }, [])

  useEffect(() => {
    if (status !== 'recording') return
    const interval = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1000)
    return () => window.clearInterval(interval)
  }, [status])

  useEffect(() => () => {
    stopVisualizer()
    releaseMedia()
    audioPlayer.current?.pause()
    if (url.current) URL.revokeObjectURL(url.current)
  }, [releaseMedia, stopVisualizer])

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setErrorMessage('Trình duyệt này không hỗ trợ ghi âm. Hãy dùng trình duyệt hiện đại và cho phép microphone.')
      setStatus('error')
      return
    }

    setStatus('requesting')
    setErrorMessage('')
    setElapsedSeconds(0)
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = nextStream
      const nextContext = new AudioContext()
      audioContext.current = nextContext
      const analyser = nextContext.createAnalyser()
      analyser.fftSize = 256
      const source = nextContext.createMediaStreamSource(nextStream)
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const bucketSize = Math.max(1, Math.floor(data.length / BAR_COUNT))
      const renderLevels = () => {
        analyser.getByteFrequencyData(data)
        setLevels(Array.from({ length: BAR_COUNT }, (_, index) => {
          const start = index * bucketSize
          const end = Math.min(data.length, start + bucketSize)
          const total = data.slice(start, end).reduce((sum, value) => sum + value, 0)
          return .12 + (end > start ? total / (end - start) / 255 : 0) * .88
        }))
        animationFrame.current = window.requestAnimationFrame(renderLevels)
      }
      renderLevels()

      const chunks: BlobPart[] = []
      const nextRecorder = new MediaRecorder(nextStream)
      recorder.current = nextRecorder
      nextRecorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data) }
      nextRecorder.onstop = () => {
        const recording = new Blob(chunks, { type: nextRecorder.mimeType || 'audio/webm' })
        if (url.current) URL.revokeObjectURL(url.current)
        const nextUrl = URL.createObjectURL(recording)
        url.current = nextUrl
        setRecordingUrl(nextUrl)
        stopVisualizer()
        releaseMedia()
        recorder.current = null
        setStatus('recorded')
      }
      nextRecorder.start()
      setStatus('recording')
    } catch {
      stopVisualizer()
      releaseMedia()
      setErrorMessage('Không thể dùng microphone. Hãy kiểm tra quyền truy cập rồi thử lại.')
      setStatus('error')
    }
  }, [releaseMedia, stopVisualizer])

  const stopRecording = useCallback(() => {
    if (recorder.current?.state !== 'recording') return
    setStatus('processing')
    recorder.current.stop()
  }, [])

  const playRecording = useCallback(async () => {
    if (!recordingUrl) return
    audioPlayer.current?.pause()
    const nextPlayer = new Audio(recordingUrl)
    audioPlayer.current = nextPlayer
    nextPlayer.onended = () => setIsPlayingBack(false)
    nextPlayer.onerror = () => {
      setIsPlayingBack(false)
      setErrorMessage('Không thể phát lại bản ghi này. Hãy thử ghi âm lại.')
    }
    try {
      setIsPlayingBack(true)
      await nextPlayer.play()
    } catch {
      setIsPlayingBack(false)
      setErrorMessage('Trình duyệt chặn phát lại tự động. Hãy thử lại bằng thao tác trực tiếp.')
    }
  }, [recordingUrl])

  return { status, elapsedSeconds, levels, recordingUrl, errorMessage, isPlayingBack, startRecording, stopRecording, playRecording }
}
