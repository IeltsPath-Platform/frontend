/** What the speech analysis reads: uncompressed 16-bit PCM, one channel, 16 kHz. */
export const WAV_SAMPLE_RATE = 16000
const BYTES_PER_SAMPLE = 2

/** Bytes a WAV of this many seconds takes, header included; used to tell before converting whether it will fit. */
export function wavBytesFor(seconds: number): number {
  return 44 + Math.ceil(seconds * WAV_SAMPLE_RATE) * BYTES_PER_SAMPLE
}

/** A WAV file (canonical 44-byte header, 16-bit PCM, mono) holding the samples, which run from -1 to 1. */
export function encodeWav16(samples: Float32Array, sampleRate: number = WAV_SAMPLE_RATE): Uint8Array {
  const dataBytes = samples.length * BYTES_PER_SAMPLE
  const bytes = new Uint8Array(44 + dataBytes)
  const view = new DataView(bytes.buffer)
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index))
  }

  text(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true)
  view.setUint16(32, BYTES_PER_SAMPLE, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, dataBytes, true)

  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]))
    view.setInt16(44 + index * BYTES_PER_SAMPLE, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
  }
  return bytes
}

/** Thrown when the browser cannot turn the recording into WAV. */
export class WavConversionError extends Error {
  constructor() {
    super('Không chuyển được bản ghi sang định dạng WAV.')
    this.name = 'WavConversionError'
  }
}

/**
 * Converts a recording the browser made (usually WebM/Opus) into a 16 kHz mono WAV: decode it, let an offline audio
 * context resample and mix it down, and write the result as PCM.
 */
export async function toWav16kMono(recording: Blob): Promise<Blob> {
  try {
    const decoder = new AudioContext()
    let decoded: AudioBuffer
    try {
      decoded = await decoder.decodeAudioData(await recording.arrayBuffer())
    } finally {
      void decoder.close()
    }
    const length = Math.max(1, Math.ceil(decoded.duration * WAV_SAMPLE_RATE))
    const offline = new OfflineAudioContext(1, length, WAV_SAMPLE_RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    return new Blob([encodeWav16(rendered.getChannelData(0)).buffer as ArrayBuffer], { type: 'audio/wav' })
  } catch {
    throw new WavConversionError()
  }
}
