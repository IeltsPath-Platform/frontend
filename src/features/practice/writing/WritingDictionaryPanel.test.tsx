import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VocabularyCatalogItem } from '@/features/vocabulary/api/notebookApi'
import { WritingDictionaryPanel } from './WritingDictionaryPanel'

const api = vi.hoisted(() => ({
  getCatalogVocabulary: vi.fn(),
  getSavedNotebookSenses: vi.fn(),
  saveNotebookEntry: vi.fn(),
}))
vi.mock('@/features/vocabulary/api/notebookApi', () => ({ notebookApi: api }))

const fluctuate: VocabularyCatalogItem = {
  id: 'item-1', lemma: 'fluctuate', ipa: null, ipaUs: 'ˈflʌktʃueɪt', ipaUk: null, pronunciationAudioReference: null,
  audioUkReference: 'https://media.test/fluctuate-uk.mp3', audioUsReference: 'https://media.test/fluctuate-us.mp3',
  senses: [
    { id: 'sense-1', partOfSpeech: 'VERB', vietnameseMeaning: 'dao động', englishDefinition: 'to rise and fall', exampleSentence: 'Prices fluctuate every month.' },
    { id: 'sense-2', partOfSpeech: 'VERB', vietnameseMeaning: 'thay đổi thất thường', englishDefinition: null, exampleSentence: null },
  ],
}

const page = (items: VocabularyCatalogItem[]) => ({ items, page: 0, size: 5, total: items.length })

function show() {
  return render(<MemoryRouter><WritingDictionaryPanel /></MemoryRouter>)
}

/** Types a text and asks for the lookup at once, so a test does not wait for the pause in typing. */
function lookUp(text: string) {
  fireEvent.change(screen.getByLabelText('Từ cần tra'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: /Tra từ vựng/ }))
}

describe('the vocabulary lookup of the Writing workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCatalogVocabulary.mockResolvedValue(page([fluctuate]))
    api.getSavedNotebookSenses.mockResolvedValue([])
    api.saveNotebookEntry.mockResolvedValue({})
  })

  it('asks for something to look up and keeps the button off until there is a text to search', () => {
    show()

    expect(screen.getByRole('complementary', { name: 'Tra từ vựng' })).toBeInTheDocument()
    expect(screen.getByText(/Nhập từ hoặc cụm từ cần tra/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tra từ vựng/ })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Từ cần tra'), { target: { value: 'f' } })
    expect(screen.getByRole('button', { name: /Tra từ vựng/ })).toBeDisabled()
    expect(screen.getByText(/Nhập thêm ít nhất 2 ký tự/)).toBeInTheDocument()
    expect(api.getCatalogVocabulary).not.toHaveBeenCalled()
  })

  it('looks an English word up in the library and shows how it sounds, what it means and an example', async () => {
    show()
    lookUp('fluctuate')

    expect(await screen.findByText('dao động')).toBeInTheDocument()
    expect(api.getCatalogVocabulary).toHaveBeenCalledWith({ q: 'fluctuate', lang: 'EN', size: 5 }, expect.any(AbortSignal))
    expect(screen.getByText('/ˈflʌktʃueɪt/')).toBeInTheDocument()
    expect(screen.getByText('dao động')).toBeInTheDocument()
    expect(screen.getByText('Prices fluctuate every month.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nghe giọng Anh của fluctuate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nghe giọng Mỹ của fluctuate' })).toBeInTheDocument()
  })

  it('searches the Vietnamese meaning on the Vietnamese-English tab', async () => {
    show()
    fireEvent.click(screen.getByRole('tab', { name: 'Tra Việt-Anh' }))
    lookUp('dao động')

    await screen.findByText('thay đổi thất thường')
    expect(api.getCatalogVocabulary).toHaveBeenCalledWith({ q: 'dao động', lang: 'VI', size: 5 }, expect.any(AbortSignal))
  })

  it('looks up after a pause in typing without the button, and not for every key', async () => {
    show()
    fireEvent.change(screen.getByLabelText('Từ cần tra'), { target: { value: 'fl' } })
    fireEvent.change(screen.getByLabelText('Từ cần tra'), { target: { value: 'fluct' } })

    expect(screen.getByText('Đang tra…')).toBeInTheDocument()
    await screen.findByText('dao động')
    expect(api.getCatalogVocabulary).toHaveBeenCalledTimes(1)
    expect(api.getCatalogVocabulary).toHaveBeenCalledWith({ q: 'fluct', lang: 'EN', size: 5 }, expect.any(AbortSignal))
  })

  it('saves a sense into the notebook with one tap and then shows it as saved', async () => {
    show()
    lookUp('fluctuate')
    const first = (await screen.findByText('dao động')).closest('li') as HTMLElement

    fireEvent.click(within(first).getByRole('button', { name: /Lưu "fluctuate" \(dao động\) vào sổ từ/ }))

    await waitFor(() => expect(api.saveNotebookEntry).toHaveBeenCalledWith('sense-1'))
    expect(await within(first).findByRole('button', { name: 'Đã lưu "fluctuate" vào sổ từ' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Mở sổ từ vựng' })).toHaveAttribute('href', '/vocabulary/notebook')
    expect(api.saveNotebookEntry).toHaveBeenCalledTimes(1)
  })

  it('shows a sense that is already in the notebook as saved', async () => {
    api.getSavedNotebookSenses.mockResolvedValue(['sense-2'])
    show()
    lookUp('fluctuate')

    expect(await screen.findByRole('button', { name: 'Đã lưu "fluctuate" vào sổ từ' })).toBeDisabled()
    expect(api.getSavedNotebookSenses).toHaveBeenCalledWith(['sense-1', 'sense-2'], expect.any(AbortSignal))
    expect(screen.getByRole('button', { name: /Lưu "fluctuate" \(dao động\) vào sổ từ/ })).toBeEnabled()
  })

  it('says so and keeps the sense unsaved when the notebook cannot take it', async () => {
    api.saveNotebookEntry.mockRejectedValue(new Error('offline'))
    show()
    lookUp('fluctuate')

    fireEvent.click(await screen.findByRole('button', { name: /Lưu "fluctuate" \(dao động\)/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được từ này vào sổ')
    expect(screen.getByRole('button', { name: /Lưu "fluctuate" \(dao động\)/ })).toBeEnabled()
  })

  it('names the text that has no entry and points to Wiktionary', async () => {
    api.getCatalogVocabulary.mockResolvedValue(page([]))
    show()
    lookUp('blorptastic')

    expect(await screen.findByText('Chưa có “blorptastic” trong từ điển của IELTS Path.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tra trên Wiktionary/ }))
      .toHaveAttribute('href', 'https://vi.wiktionary.org/w/index.php?search=blorptastic')
  })

  it('tells the learner when the lookup failed and lets them try again', async () => {
    api.getCatalogVocabulary.mockRejectedValueOnce(new Error('offline'))
    show()
    lookUp('fluctuate')

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tra được lúc này')

    fireEvent.click(screen.getByRole('button', { name: /Tra từ vựng/ }))
    expect(await screen.findByText('dao động')).toBeInTheDocument()
    expect(api.getCatalogVocabulary).toHaveBeenCalledTimes(2)
  })

  it('lists what was looked up and searches it again when picked', async () => {
    show()
    lookUp('fluctuate')
    await screen.findByText('dao động')

    const history = screen.getByRole('list', { name: 'Các từ đã tra' })
    fireEvent.click(within(history).getByRole('button', { name: 'fluctuate' }))

    await waitFor(() => expect(api.getCatalogVocabulary).toHaveBeenCalledTimes(2))
  })

  it('keeps the text to 50 characters and shows how many are used', () => {
    show()
    fireEvent.change(screen.getByLabelText('Từ cần tra'), { target: { value: 'a'.repeat(60) } })

    expect(screen.getByText('50/50 ký tự')).toBeInTheDocument()
  })
})
