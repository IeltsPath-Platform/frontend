import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { preloadImages } from './preloadImages'

/** An Image whose load or failure the test triggers by hand. */
class FakeImage {
  static all: FakeImage[] = []
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  constructor() { FakeImage.all.push(this) }
}

describe('preloadImages', () => {
  beforeEach(() => {
    FakeImage.all = []
    vi.useFakeTimers()
    vi.stubGlobal('Image', FakeImage)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('resolves at once when there is nothing to load', async () => {
    await expect(preloadImages([undefined, null, ''], 1000)).resolves.toBeUndefined()
    expect(FakeImage.all).toHaveLength(0)
  })

  it('waits until every image has loaded, and counts one that failed as done', async () => {
    let resolved = false
    void preloadImages(['/a.webp', '/b.webp'], 5000).then(() => { resolved = true })

    FakeImage.all[0]!.onload?.()
    await Promise.resolve()
    expect(resolved).toBe(false)

    FakeImage.all[1]!.onerror?.()
    await Promise.resolve()
    expect(resolved).toBe(true)
  })

  it('loads an address once even when several cards use it', () => {
    void preloadImages(['/a.webp', '/a.webp', '/b.webp'], 5000)

    expect(FakeImage.all.map((image) => image.src)).toEqual(['/a.webp', '/b.webp'])
  })

  it('stops waiting after the time limit', async () => {
    let resolved = false
    void preloadImages(['/slow.webp'], 2500).then(() => { resolved = true })

    await vi.advanceTimersByTimeAsync(2499)
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(resolved).toBe(true)
  })

  it('stops waiting when the request is aborted', async () => {
    const controller = new AbortController()
    let resolved = false
    void preloadImages(['/slow.webp'], 60000, controller.signal).then(() => { resolved = true })

    controller.abort()
    await Promise.resolve()

    expect(resolved).toBe(true)
  })
})
