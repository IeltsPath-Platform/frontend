import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WordLookupPopover } from './WordLookupPopover'
import type { WordLookupState } from './useWordLookup'
import type { WordEntry } from './wordLookupApi'

const speak = vi.hoisted(() => vi.fn())
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
})
