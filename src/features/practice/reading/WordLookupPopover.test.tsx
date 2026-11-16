import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WordLookupPopover } from './WordLookupPopover'
import type { WordLookupState } from './useWordLookup'
import type { WordEntry } from './wordLookupApi'

const speak = vi.hoisted(() => vi.fn())
const notebook = vi.hoisted(() => ({ getSavedNotebookSenses: vi.fn(), saveNotebookEntry: vi.fn() }))
vi.mock('@/features/vocabulary/api/notebookApi', () => ({ notebookApi: notebook }))
vi.mock('@/features/flashcards/lib/speak', () => ({ speak }))

const rect = { left: 10, right: 60, top: 10, bottom: 30, width: 50, height: 20 } as DOMRect

function found(entry: Partial<WordEntry>): WordLookupState {
  return {
    word: 'surface', rect, status: 'found',
    entry: { lemma: 'surface', ipa: '/ˈsɜːfəs/', audioUk: null, audioUs: null, senses: [], ...entry },
  }
}

describe('WordLookupPopover pronunciation', () => {
  const played: string[] = []
  let failToPlay = false

  beforeEach(() => {
    played.length = 0
    notebook.getSavedNotebookSenses.mockReset().mockResolvedValue([])
    notebook.saveNotebookEntry.mockReset().mockResolvedValue({})
    failToPlay = false
    speak.mockClear()
    vi.stubGlobal('Audio', class {
      readonly url: string
      constructor(url: string) { this.url = url }
      pause() {}
      play() {
        played.push(this.url)
        return failToPlay ? Promise.reject(new Error('blocked')) : Promise.resolve()
      }
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('plays the recording of the accent that was clicked', async () => {
    render(<WordLookupPopover state={found({ audioUk: 'https://media/uk/surface.mp3', audioUs: 'https://media/us/surface.mp3' })} onClose={() => {}} onRetry={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Mỹ' }))
    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Anh' }))

    expect(played).toEqual(['https://media/us/surface.mp3', 'https://media/uk/surface.mp3'])
    expect(speak).not.toHaveBeenCalled()
  })

  it('only offers the accents that have a recording', () => {
    render(<WordLookupPopover state={found({ audioUs: 'https://media/us/surface.mp3' })} onClose={() => {}} onRetry={() => {}} />)

    expect(screen.getByRole('button', { name: 'Nghe giọng Mỹ' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nghe giọng Anh' })).not.toBeInTheDocument()
  })

  it('lets the browser read the word when there is no recording', async () => {
    render(<WordLookupPopover state={found({})} onClose={() => {}} onRetry={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: 'Nghe phát âm' }))

    expect(speak).toHaveBeenCalledWith('surface')
  })

  it('lets the browser read the word when the recording cannot be played', async () => {
    failToPlay = true
    render(<WordLookupPopover state={found({ audioUk: 'https://media/uk/surface.mp3' })} onClose={() => {}} onRetry={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: 'Nghe giọng Anh' }))

    await vi.waitFor(() => expect(speak).toHaveBeenCalledWith('surface'))
  })

  it('shows no pronunciation button for a word the library does not know', () => {
    render(<WordLookupPopover state={{ word: 'zzz', rect, status: 'missing' }} onClose={() => {}} onRetry={() => {}} />)

    expect(screen.queryByRole('button', { name: /Nghe/ })).not.toBeInTheDocument()
  })

  describe('saving a meaning to the notebook', () => {
    const withSenses = () => found({
      senses: [
        { id: 'sense-1', partOfSpeech: 'NOUN', vietnameseMeaning: 'bề mặt', englishDefinition: null, exampleSentence: null },
        { id: 'sense-2', partOfSpeech: 'VERB', vietnameseMeaning: 'nổi lên', englishDefinition: null, exampleSentence: null },
      ],
    })
    const show = (state: WordLookupState) => render(<MemoryRouter><WordLookupPopover state={state} onClose={() => {}} onRetry={() => {}} /></MemoryRouter>)

    it('saves the meaning that was tapped with one tap and then shows it as saved', async () => {
      show(withSenses())

      await userEvent.click(screen.getByRole('button', { name: /Lưu "surface" \(bề mặt\) vào sổ từ/ }))

      expect(notebook.saveNotebookEntry).toHaveBeenCalledExactlyOnceWith('sense-1')
      expect(await screen.findByRole('button', { name: 'Đã lưu "surface" vào sổ từ' })).toBeDisabled()
      expect(screen.getByRole('button', { name: /Lưu "surface" \(nổi lên\) vào sổ từ/ })).toBeEnabled()
      expect(screen.getByRole('link', { name: 'Mở sổ từ vựng' })).toHaveAttribute('href', '/vocabulary/notebook')
    })

    it('shows a meaning that is already in the notebook as saved', async () => {
      notebook.getSavedNotebookSenses.mockResolvedValue(['sense-2'])
      show(withSenses())

      expect(await screen.findByRole('button', { name: 'Đã lưu "surface" vào sổ từ' })).toBeDisabled()
      expect(notebook.getSavedNotebookSenses).toHaveBeenCalledWith(['sense-1', 'sense-2'], expect.any(AbortSignal))
    })

    it('says so and keeps the meaning unsaved when the notebook cannot take it', async () => {
      notebook.saveNotebookEntry.mockRejectedValue(new Error('offline'))
      show(withSenses())

      await userEvent.click(screen.getByRole('button', { name: /Lưu "surface" \(bề mặt\)/ }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được từ này vào sổ')
      expect(screen.getByRole('button', { name: /Lưu "surface" \(bề mặt\)/ })).toBeEnabled()
    })

    it('offers no save for a meaning the library did not give an id', () => {
      show(found({ senses: [{ id: null, partOfSpeech: 'NOUN', vietnameseMeaning: 'bề mặt', englishDefinition: null, exampleSentence: null }] }))

      expect(screen.getByText('bề mặt')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /vào sổ từ/ })).not.toBeInTheDocument()
      expect(notebook.getSavedNotebookSenses).not.toHaveBeenCalled()
    })
  })
})
