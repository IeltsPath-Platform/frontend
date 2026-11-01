import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ListeningExamAudio } from './ListeningExamAudio'

const play = vi.fn<() => Promise<void>>()
const pause = vi.fn()

function renderAudio(props: Partial<Parameters<typeof ListeningExamAudio>[0]> = {}) {
  const handlers = { onStarted: vi.fn(), onEnded: vi.fn() }
  const view = render(<ListeningExamAudio src="https://media.example/part-1.mp3" alreadyPlayed={false} {...handlers} {...props} />)
  return { ...handlers, audio: view.container.querySelector('audio'), view }
}

describe('ListeningExamAudio', () => {
  beforeEach(() => {
    play.mockReset().mockResolvedValue(undefined)
    pause.mockReset()
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(play)
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(pause)
  })
  afterEach(() => {
    // Unmount while pause() is still faked: jsdom does not implement it.
    cleanup()
    vi.restoreAllMocks()
  })

  it('starts the recording by itself', () => {
    renderAudio()

    expect(play).toHaveBeenCalledTimes(1)
  })

  it('leaves the learner no control at all: no play, pause, rewind, progress or volume slider', () => {
    renderAudio()

    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('status').querySelector('audio')).not.toHaveAttribute('controls')
  })

  it('reports when the recording starts and when it ends', () => {
    const { audio, onStarted, onEnded } = renderAudio()

    fireEvent.play(audio!)
    expect(screen.getByText('Đang phát bài nghe')).toBeInTheDocument()
    expect(onStarted).toHaveBeenCalledTimes(1)

    fireEvent.ended(audio!)
    expect(screen.getByText('Bài nghe của phần này đã kết thúc')).toBeInTheDocument()
    expect(onEnded).toHaveBeenCalledTimes(1)
  })

  it('offers one button to start when the browser blocks sound that starts by itself', async () => {
    play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
    renderAudio()

    const start = await screen.findByRole('button', { name: 'Bắt đầu bài nghe' })
    await userEvent.click(start)

    expect(play).toHaveBeenCalledTimes(2)
  })

  it('reports a recording that cannot be played', async () => {
    play.mockRejectedValueOnce(new Error('decode'))
    renderAudio()

    await waitFor(() => expect(screen.getByText('Không phát được bài nghe')).toBeInTheDocument())
  })

  it('does not play a part again once it has been heard', () => {
    const { audio } = renderAudio({ alreadyPlayed: true })

    expect(audio).toBeNull()
    expect(play).not.toHaveBeenCalled()
    expect(screen.getByText('Bài nghe của phần này đã kết thúc')).toBeInTheDocument()
  })

  it('cuts the recording short when the learner leaves the part', () => {
    const { view } = renderAudio()

    view.unmount()

    expect(pause).toHaveBeenCalled()
  })
})
