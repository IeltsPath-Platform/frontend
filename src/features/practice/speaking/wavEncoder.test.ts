import { describe, expect, it } from 'vitest'
import { WAV_SAMPLE_RATE, encodeWav16, wavBytesFor } from './wavEncoder'

const text = (bytes: Uint8Array, offset: number, length: number) => String.fromCharCode(...bytes.slice(offset, offset + length))

describe('encodeWav16', () => {
  it('writes a canonical header for 16-bit mono PCM at 16 kHz', () => {
    const wav = encodeWav16(new Float32Array(1600))
    const view = new DataView(wav.buffer)

    expect(text(wav, 0, 4)).toBe('RIFF')
    expect(text(wav, 8, 4)).toBe('WAVE')
    expect(text(wav, 12, 4)).toBe('fmt ')
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(WAV_SAMPLE_RATE)
    expect(view.getUint32(28, true)).toBe(WAV_SAMPLE_RATE * 2)
    expect(view.getUint16(34, true)).toBe(16)
    expect(text(wav, 36, 4)).toBe('data')
    expect(view.getUint32(40, true)).toBe(3200)
    expect(view.getUint32(4, true)).toBe(36 + 3200)
    expect(wav.length).toBe(44 + 3200)
  })

  it('scales samples to 16-bit and clips what is out of range', () => {
    const wav = encodeWav16(new Float32Array([0, 1, -1, 0.5, -0.5, 2, -3]))
    const view = new DataView(wav.buffer)
    const sample = (index: number) => view.getInt16(44 + index * 2, true)

    expect(sample(0)).toBe(0)
    expect(sample(1)).toBe(32767)
    expect(sample(2)).toBe(-32768)
    expect(sample(3)).toBe(Math.trunc(0.5 * 0x7fff))
    expect(sample(4)).toBe(-16384)
    expect(sample(5)).toBe(32767)
    expect(sample(6)).toBe(-32768)
  })

  it('keeps an empty recording a valid, empty file', () => {
    expect(encodeWav16(new Float32Array(0)).length).toBe(44)
  })
})

describe('wavBytesFor', () => {
  it('matches the size of the file that is written', () => {
    expect(wavBytesFor(2)).toBe(encodeWav16(new Float32Array(2 * WAV_SAMPLE_RATE)).length)
  })

  it('shows that about two and a half minutes fit in five megabytes', () => {
    expect(wavBytesFor(150)).toBeLessThan(5 * 1024 * 1024)
    expect(wavBytesFor(170)).toBeGreaterThan(5 * 1024 * 1024)
  })
})
