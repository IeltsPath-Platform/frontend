import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminVocabularyPage } from './AdminVocabularyPage'

const { api, media } = vi.hoisted(() => ({
  api: {
    getCatalogVocabulary: vi.fn(),
    getVocabularyItem: vi.fn(),
    updateAdminItem: vi.fn(),
    getAdminTopics: vi.fn(),
    createAdminTopic: vi.fn(),
    updateAdminTopic: vi.fn(),
    deleteAdminTopic: vi.fn(),
    getAdminSets: vi.fn(),
    createAdminSet: vi.fn(),
    updateAdminSet: vi.fn(),
    deleteAdminSet: vi.fn(),
  },
  media: { uploadAdminImage: vi.fn() },
}))

vi.mock('@/features/vocabulary/api/notebookApi', () => ({ notebookApi: api }))
vi.mock('@/features/admin/media/api/mediaUploadApi', () => media)

function show() {
  return render(<MemoryRouter><AdminVocabularyPage /></MemoryRouter>)
}

describe('AdminVocabularyPage catalog covers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCatalogVocabulary.mockResolvedValue({ items: [] })
    api.getAdminTopics.mockResolvedValue([])
    api.getAdminSets.mockResolvedValue([])
    api.createAdminTopic.mockResolvedValue({})
    api.createAdminSet.mockResolvedValue({})
    media.uploadAdminImage.mockResolvedValue({
      mediaReference: 'catalog-cover/author-1/cover.png',
      mediaUrl: 'https://storage.example/catalog-cover/author-1/cover.png',
      contentType: 'image/png',
      sizeBytes: 8,
    })
  })

  it('uploads and saves the topic cover reference', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: /Topics/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo chủ đề mới' }))

    const form = screen.getByPlaceholderText('VD: environment').closest('form')!
    fireEvent.change(within(form).getByPlaceholderText('VD: Môi trường'), { target: { value: 'Môi trường' } })
    fireEvent.change(within(form).getByPlaceholderText('VD: Environment'), { target: { value: 'Environment' } })
    fireEvent.change(within(form).getByPlaceholderText('VD: environment'), { target: { value: 'environment' } })
    const file = new File(['png-data'], 'cover.png', { type: 'image/png' })
    fireEvent.change(within(form).getByLabelText('Ảnh bìa chủ đề'), { target: { files: [file] } })

    await waitFor(() => expect(media.uploadAdminImage).toHaveBeenCalledWith(
      '/api/content/admin/vocabulary/covers', file,
    ))
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.createAdminTopic).toHaveBeenCalledWith(expect.objectContaining({
      coverKey: 'catalog-cover/author-1/cover.png',
    })))
  })

  it('sends null when a set cover is cleared', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: /Sets/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo bộ từ mới' }))

    const form = screen.getByPlaceholderText('VD: Từ vựng Band 6.5 - 7.5').closest('form')!
    fireEvent.change(within(form).getByPlaceholderText('VD: Từ vựng Band 6.5 - 7.5'), { target: { value: 'B2 words' } })
    const file = new File(['png-data'], 'cover.png', { type: 'image/png' })
    fireEvent.change(within(form).getByLabelText('Ảnh bìa bộ từ'), { target: { files: [file] } })
    await waitFor(() => expect(media.uploadAdminImage).toHaveBeenCalledWith(
      '/api/content/admin/vocabulary/covers', file,
    ))

    fireEvent.click(within(form).getByRole('button', { name: 'Xóa ảnh bìa' }))
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.createAdminSet).toHaveBeenCalledWith(expect.objectContaining({ coverKey: null })))
  })
})

describe('AdminVocabularyPage item form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCatalogVocabulary.mockResolvedValue({ items: [] })
    api.getAdminTopics.mockResolvedValue([])
    api.getAdminSets.mockResolvedValue([])
    api.updateAdminItem.mockResolvedValue({})
  })

  it('preserves exact UK and US values when saving a word with both pronunciations', async () => {
    api.getCatalogVocabulary.mockResolvedValue({
      items: [{ id: 'word-1', lemma: 'resilience', senses: [] }],
    })
    api.getVocabularyItem.mockResolvedValue({
      id: 'word-1',
      lemma: 'resilience',
      ipaUk: '/rɪˈzɪl.jəns/',
      ipaUs: '/rɪˈzɪl.jəns/',
      audioUkReference: 'https://media/uk/resilience.mp3',
      audioUsReference: 'https://media/us/resilience.mp3',
      pronunciationAudioReference: 'https://media/us/resilience.mp3',
      frequencyRank: 1200,
      academicWordList: true,
      wordFamily: 'resilient',
      senses: [],
    })

    show()

    const wordCard = await screen.findByText('resilience')
    fireEvent.click(wordCard)

    const form = (await screen.findByRole('button', { name: /Lưu thông tin từ/i })).closest('form')!
    const ukIpaInput = within(form).getByLabelText(/Phiên âm UK/i) as HTMLInputElement
    const usIpaInput = within(form).getByLabelText(/Phiên âm US/i) as HTMLInputElement
    const ukAudioInput = within(form).getByLabelText(/Audio UK URL/i) as HTMLInputElement
    const usAudioInput = within(form).getByLabelText(/Audio US URL/i) as HTMLInputElement

    expect(ukIpaInput.value).toBe('/rɪˈzɪl.jəns/')
    expect(usIpaInput.value).toBe('/rɪˈzɪl.jəns/')
    expect(ukAudioInput.value).toBe('https://media/uk/resilience.mp3')
    expect(usAudioInput.value).toBe('https://media/us/resilience.mp3')

    fireEvent.click(screen.getByRole('button', { name: /Lưu thông tin từ/i }))

    await waitFor(() =>
      expect(api.updateAdminItem).toHaveBeenCalledWith(
        'word-1',
        expect.objectContaining({
          ipaUk: '/rɪˈzɪl.jəns/',
          ipaUs: '/rɪˈzɪl.jəns/',
          audioUkReference: 'https://media/uk/resilience.mp3',
          audioUsReference: 'https://media/us/resilience.mp3',
        }),
      ),
    )
  })

  it('keeps UK fields empty and preserves US fields when word only has US pronunciation', async () => {
    api.getCatalogVocabulary.mockResolvedValue({
      items: [{ id: 'word-2', lemma: 'apartment', senses: [] }],
    })
    api.getVocabularyItem.mockResolvedValue({
      id: 'word-2',
      lemma: 'apartment',
      ipaUk: null,
      ipaUs: '/əˈpɑːrt.mənt/',
      audioUkReference: null,
      audioUsReference: 'https://media/us/apartment.mp3',
      pronunciationAudioReference: 'https://media/us/apartment.mp3',
      frequencyRank: null,
      academicWordList: false,
      wordFamily: null,
      senses: [],
    })

    show()

    const wordCard = await screen.findByText('apartment')
    fireEvent.click(wordCard)

    const form = (await screen.findByRole('button', { name: /Lưu thông tin từ/i })).closest('form')!
    const ukIpaInput = within(form).getByLabelText(/Phiên âm UK/i) as HTMLInputElement
    const usIpaInput = within(form).getByLabelText(/Phiên âm US/i) as HTMLInputElement
    const ukAudioInput = within(form).getByLabelText(/Audio UK URL/i) as HTMLInputElement
    const usAudioInput = within(form).getByLabelText(/Audio US URL/i) as HTMLInputElement

    // UK fields are empty; US fields are populated with US values
    expect(ukIpaInput.value).toBe('')
    expect(ukAudioInput.value).toBe('')
    expect(usIpaInput.value).toBe('/əˈpɑːrt.mənt/')
    expect(usAudioInput.value).toBe('https://media/us/apartment.mp3')

    fireEvent.click(screen.getByRole('button', { name: /Lưu thông tin từ/i }))

    await waitFor(() =>
      expect(api.updateAdminItem).toHaveBeenCalledWith(
        'word-2',
        expect.objectContaining({
          ipaUk: '',
          audioUkReference: '',
          ipaUs: '/əˈpɑːrt.mənt/',
          audioUsReference: 'https://media/us/apartment.mp3',
        }),
      ),
    )
  })
})
