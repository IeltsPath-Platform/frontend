import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLessonVocabularySenses, type VocabularySenseCard } from '../api/lessonVocabularyApi'
import { LessonVocabulary } from './LessonVocabulary'

vi.mock('../api/lessonVocabularyApi', () => ({ getLessonVocabularySenses: vi.fn() }))

function card(senseId = 'sense-1', lemma = 'context', audio: string | null = null): VocabularySenseCard {
  return {
    senseId, lemma, vocabularyItemId: 'item-1', ipa: '/ˈkɒntekst/', partOfSpeech: 'NOUN',
    englishDefinition: 'The situation in which something happens.', vietnameseMeaning: 'ngữ cảnh',
    exampleSentence: 'Read the word in context.', pronunciationAudioReference: audio, imageUrl: null,
  }
}

const AUDIO_URL = 'https://example.supabase.co/storage/v1/object/public/media/vocabulary/pronunciation/us/context.mp3'

/** Replaces the browser Audio so a test can see which file is played and decide whether playback works. */
function stubAudio(play: () => Promise<void>) {
  const created: FakeAudio[] = []
  class FakeAudio {
    onended: (() => void) | null = null
    onpause: (() => void) | null = null
    onerror: (() => void) | null = null
    play = vi.fn(play)
    pause = vi.fn()
    readonly src: string
    constructor(src: string) {
      this.src = src
      created.push(this)
    }
  }
  vi.stubGlobal('Audio', FakeAudio)
  return created
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => { vi.mocked(getLessonVocabularySenses).mockReset() })
afterEach(() => { vi.unstubAllGlobals() })

describe('lesson vocabulary', () => {
  it('shows an empty state without a Library request for a lesson with no IDs', () => {
    render(<LessonVocabulary senseIds={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('Bài học này chưa có từ vựng.')
    expect(getLessonVocabularySenses).not.toHaveBeenCalled()
  })

  it('shows loading followed by the word, friendly part of speech, meanings and example', async () => {
    const pending = deferred<VocabularySenseCard[]>()
    vi.mocked(getLessonVocabularySenses).mockReturnValue(pending.promise)
    render(<LessonVocabulary senseIds={['sense-1']} />)
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải từ vựng')
    await act(async () => pending.resolve([card()]))
    expect(screen.getByRole('heading', { name: 'context' })).toBeInTheDocument()
    for (const text of ['Danh từ', '/ˈkɒntekst/', 'ngữ cảnh', 'The situation in which something happens.', 'Read the word in context.']) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })

  it('offers a working retry after Library fails', async () => {
    const user = userEvent.setup()
    vi.mocked(getLessonVocabularySenses).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([card()])
    render(<LessonVocabulary senseIds={['sense-1']} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được từ vựng')
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('heading', { name: 'context' })).toBeInTheDocument()
    expect(getLessonVocabularySenses).toHaveBeenCalledTimes(2)
  })

  it('keeps available words readable when some senses are unavailable', async () => {
    vi.mocked(getLessonVocabularySenses).mockResolvedValue([card()])
    render(<LessonVocabulary senseIds={['sense-1', 'missing', 'sense-1']} />)
    expect(await screen.findByRole('heading', { name: 'context' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Một số từ vựng hiện chưa khả dụng')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('shows an unavailable state when Library omits every sense', async () => {
    vi.mocked(getLessonVocabularySenses).mockResolvedValue([])
    render(<LessonVocabulary senseIds={['missing']} />)
    expect(await screen.findByText('Từ vựng của bài học hiện chưa khả dụng.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('plays the pronunciation file of the word when its button is pressed', async () => {
    const user = userEvent.setup()
    const created = stubAudio(() => Promise.resolve())
    vi.mocked(getLessonVocabularySenses).mockResolvedValue([card('sense-1', 'context', AUDIO_URL)])
    render(<LessonVocabulary senseIds={['sense-1']} />)
    await user.click(await screen.findByRole('button', { name: 'Nghe phát âm từ context' }))
    expect(created).toHaveLength(1)
    expect(created[0].src).toBe(AUDIO_URL)
    expect(created[0].play).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Chưa phát được âm thanh.')).not.toBeInTheDocument()
  })

  it('stops the word still playing before the next one starts', async () => {
    const user = userEvent.setup()
    const created = stubAudio(() => Promise.resolve())
    vi.mocked(getLessonVocabularySenses).mockResolvedValue([
      card('sense-1', 'context', AUDIO_URL), card('sense-2', 'layer', AUDIO_URL.replace('context', 'layer')),
    ])
    render(<LessonVocabulary senseIds={['sense-1', 'sense-2']} />)
    await user.click(await screen.findByRole('button', { name: 'Nghe phát âm từ context' }))
    await user.click(screen.getByRole('button', { name: 'Nghe phát âm từ layer' }))
    expect(created).toHaveLength(2)
    expect(created[0].pause).toHaveBeenCalled()
  })

  it('tells the learner when the recording cannot be played', async () => {
    const user = userEvent.setup()
    stubAudio(() => Promise.reject(new Error('404')))
    vi.mocked(getLessonVocabularySenses).mockResolvedValue([card('sense-1', 'context', AUDIO_URL)])
    render(<LessonVocabulary senseIds={['sense-1']} />)
    await user.click(await screen.findByRole('button', { name: 'Nghe phát âm từ context' }))
    expect(await screen.findByText('Chưa phát được âm thanh.')).toBeInTheDocument()
  })

  it('shows no play button for a word without a playable recording', async () => {
    vi.mocked(getLessonVocabularySenses).mockResolvedValue([
      card('sense-1', 'context', null), card('sense-2', 'layer', 'vocabulary/layer.mp3'),
    ])
    render(<LessonVocabulary senseIds={['sense-1', 'sense-2']} />)
    expect(await screen.findByRole('heading', { name: 'layer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Nghe phát âm/ })).not.toBeInTheDocument()
  })

  it('replaces words when sense IDs change and ignores the older pending response', async () => {
    const older = deferred<VocabularySenseCard[]>()
    const newer = deferred<VocabularySenseCard[]>()
    vi.mocked(getLessonVocabularySenses).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    const view = render(<LessonVocabulary senseIds={['old']} />)
    view.rerender(<LessonVocabulary senseIds={['new']} />)
    await act(async () => newer.resolve([card('new', 'current')]))
    expect(screen.getByRole('heading', { name: 'current' })).toBeInTheDocument()
    await act(async () => older.resolve([card('old', 'outdated')]))
    expect(screen.queryByRole('heading', { name: 'outdated' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'current' })).toBeInTheDocument()
    view.rerender(<LessonVocabulary senseIds={[]} />)
    expect(screen.queryByRole('heading', { name: 'current' })).not.toBeInTheDocument()
    expect(getLessonVocabularySenses).toHaveBeenCalledTimes(2)
  })
})
