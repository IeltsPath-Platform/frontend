import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SavedRecording } from '../speaking/speakingSession'

const BAR_COUNT = 28
const INITIAL_LEVELS = Array.from({ length: BAR_COUNT }, (_, index) => .16 + (index % 5) * .05)
/** The loudest frequency bin, 0 to 1, below which a recording counts as silent: a muted or wrong microphone reads about 0. */
const SILENT_PEAK = .04
const MIC_KEY = 'practice.speaking.micId'

export interface MicrophoneOption {
  id: string
  /** A short name for the list: "Microphone Array", "Rapoo Gaming Headset". */
  label: string
  /** The name the browser gave, for a tooltip and for picking the default; empty until the microphone is allowed. */
  detail: string
}

function storedMicrophone(): string {
  try {
    return window.localStorage.getItem(MIC_KEY) ?? ''
  } catch {
    return ''
  }
}

/** "Default - Microphone Array (Realtek(R) Audio)" becomes "Microphone Array"; "Microphone (Rapoo Gaming Headset)" becomes "Rapoo Gaming Headset". */
function shortName(label: string): string {
  const clean = label.replace(/^(default|communications)\s*-\s*/i, '').replace(/\((R|TM)\)/gi, '').replace(/\s+/g, ' ').trim()
  const inside = /^microphone\s*\((.+)\)$/i.exec(clean)
  if (inside) return inside[1].trim()
  return clean.replace(/\s*\([^)]*\)\s*$/, '').trim() || clean
}

/** A virtual device of a remote-desktop or recording tool: it carries no real sound, so a recording from it is silent. */
const VIRTUAL_MICROPHONE = /virtual|loopback|stereo mix|vb-?(audio|cable)|voicemeeter|deskin|remote/i
/** A headset microphone: a real speaking test is taken without one, so it is never offered. */
const HEADSET_MICROPHONE = /headset|headphone|earphone|earbud|airpods|bluetooth|hands-?free|gaming/i
const BUILT_IN_MICROPHONE = /array|built-?in|internal|integrated|laptop/i

/**
 * The microphones the learner may use: those of the computer, not a headset's and not a virtual one, the way a real
 * speaking test is taken. The browser's "default" and "communications" entries only repeat another microphone, so they
 * are left out too. If nothing else is left, whatever the computer has is listed so the learner is never stuck.
 */
function microphoneOptions(devices: readonly MediaDeviceInfo[]): MicrophoneOption[] {
  const inputs = devices.filter((device) => device.kind === 'audioinput')
  const distinct = inputs.filter((device) => device.deviceId !== 'default' && device.deviceId !== 'communications')
  const room = distinct.filter((device) => !VIRTUAL_MICROPHONE.test(device.label) && !HEADSET_MICROPHONE.test(device.label))
  const shown = room.length > 0 ? room : distinct.length > 0 ? distinct : inputs
  return shown.map((device, index) => ({
    id: device.deviceId,
    label: shortName(device.label) || `Micro ${index + 1}`,
    detail: device.label,
  }))
}

/**
 * The microphone to use when the learner has not chosen: the one built into the computer, else the first listed. Empty
 * means "let the browser decide", which is all that can be done before the names are known.
 */
function defaultMicrophone(options: readonly MicrophoneOption[]): string {
  const named = options.filter((option) => option.detail !== '')
  return (named.find((option) => BUILT_IN_MICROPHONE.test(option.detail)) ?? named[0])?.id ?? ''
}

/** Opens the chosen microphone; one that is gone (unplugged since last time) falls back to the system default. */
async function openMicrophone(deviceId: string): Promise<MediaStream> {
  if (!deviceId) return navigator.mediaDevices.getUserMedia({ audio: true })
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } })
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'OverconstrainedError' || error.name === 'NotFoundError')) {
      return navigator.mediaDevices.getUserMedia({ audio: true })
    }
    throw error
  }
}

interface RecorderOptions {
  /** A recording made earlier for the same question: the recorder opens already "recorded", ready to play. */
  saved?: SavedRecording | null
  /** Called with every recording that finishes, so it can be kept beyond this recorder. */
  onSaved?: (recording: SavedRecording) => void
}

export function useAudioRecorder({ saved = null, onSaved }: RecorderOptions = {}) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording' | 'processing' | 'recorded' | 'error'>(saved ? 'recorded' : 'idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(saved?.durationSeconds ?? 0)
  const [levels, setLevels] = useState<number[]>(INITIAL_LEVELS)
  const [firstUrl] = useState(() => (saved ? URL.createObjectURL(saved.blob) : null))
  const [recordingUrl, setRecordingUrl] = useState<string | null>(firstUrl)
  const [errorMessage, setErrorMessage] = useState('')
  const [isPlayingBack, setIsPlayingBack] = useState(false)
  /** True when the finished recording carried no sound, so playing it back would be silent. */
  const [silent, setSilent] = useState(saved?.silent ?? false)
  /** The microphone the browser recorded from, so a silent recording can say which device was used. */
  const [inputName, setInputName] = useState(saved?.inputName ?? '')
  const startedAt = useRef(0)
  const savedCallback = useRef(onSaved)
  useEffect(() => { savedCallback.current = onSaved })
  /** The microphones of the computer and the one the learner chose; only a deliberate choice is remembered. */
  const [inputs, setInputs] = useState<MicrophoneOption[]>([])
  const [chosenId, setChosenId] = useState(storedMicrophone)
  // The choice if that microphone is still there, else the built-in one; empty lets the browser pick its default.
  const inputId = useMemo(
    () => (inputs.some((input) => input.id === chosenId) ? chosenId : defaultMicrophone(inputs)),
    [inputs, chosenId],
  )
  const loudest = useRef(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const animationFrame = useRef<number | null>(null)
  const audioPlayer = useRef<HTMLAudioElement | null>(null)
  const url = useRef<string | null>(firstUrl)

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

  // The list gets its names once the browser has been allowed the microphone, and changes when one is plugged in.
  const refreshInputs = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    setInputs(microphoneOptions(await navigator.mediaDevices.enumerateDevices()))
  }, [])

  useEffect(() => {
    const devices = navigator.mediaDevices
    if (!devices?.enumerateDevices) return
    let gone = false
    const load = () => { void devices.enumerateDevices().then((found) => { if (!gone) setInputs(microphoneOptions(found)) }) }
    load()
    devices.addEventListener?.('devicechange', load)
    return () => {
      gone = true
      devices.removeEventListener?.('devicechange', load)
    }
  }, [])

  const selectInput = useCallback((id: string) => {
    setChosenId(id)
    try {
      window.localStorage.setItem(MIC_KEY, id)
    } catch {
      // A private window may refuse storage; the choice then lasts until the page is closed.
    }
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
    setSilent(false)
    setInputName('')
    loudest.current = 0
    try {
      const nextStream = await openMicrophone(inputId)
      stream.current = nextStream
      setInputName(nextStream.getAudioTracks()[0]?.label ?? '')
      void refreshInputs()
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
        loudest.current = Math.max(loudest.current, Math.max(...data) / 255)
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
      const deviceName = nextStream.getAudioTracks()[0]?.label ?? ''
      const nextRecorder = new MediaRecorder(nextStream)
      recorder.current = nextRecorder
      nextRecorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data) }
      nextRecorder.onstop = () => {
        const recording = new Blob(chunks, { type: nextRecorder.mimeType || 'audio/webm' })
        if (url.current) URL.revokeObjectURL(url.current)
        const nextUrl = URL.createObjectURL(recording)
        url.current = nextUrl
        setRecordingUrl(nextUrl)
        const noSound = loudest.current < SILENT_PEAK
        setSilent(noSound)
        stopVisualizer()
        releaseMedia()
        recorder.current = null
        setStatus('recorded')
        savedCallback.current?.({
          blob: recording,
          durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
          silent: noSound,
          inputName: deviceName,
        })
      }
      startedAt.current = Date.now()
      nextRecorder.start()
      setStatus('recording')
    } catch {
      stopVisualizer()
      releaseMedia()
      setErrorMessage('Không thể dùng microphone. Hãy kiểm tra quyền truy cập rồi thử lại.')
      setStatus('error')
    }
  }, [inputId, refreshInputs, releaseMedia, stopVisualizer])

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
    setErrorMessage('')
    // Each end of playback, whether it finished, was stopped or failed, frees the button; a stale player may not touch it.
    const finished = () => { if (audioPlayer.current === nextPlayer) setIsPlayingBack(false) }
    nextPlayer.onended = finished
    nextPlayer.onpause = finished
    nextPlayer.onerror = () => {
      finished()
      setErrorMessage('Không thể phát lại bản ghi này. Hãy thử ghi âm lại.')
    }
    try {
      setIsPlayingBack(true)
      await nextPlayer.play()
    } catch {
      finished()
      setErrorMessage('Trình duyệt chặn phát lại tự động. Hãy thử lại bằng thao tác trực tiếp.')
    }
  }, [recordingUrl])

  const stopPlayback = useCallback(() => {
    audioPlayer.current?.pause()
    setIsPlayingBack(false)
  }, [])

  return {
    status, elapsedSeconds, levels, recordingUrl, errorMessage, isPlayingBack, silent, inputName, inputs, inputId,
    startRecording, stopRecording, playRecording, stopPlayback, selectInput,
  }
}
