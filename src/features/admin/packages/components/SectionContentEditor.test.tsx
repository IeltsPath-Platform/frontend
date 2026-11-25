import { act, fireEvent, render, screen, waitFor } from '@/test/render'
import { answerConfirm } from '@/test/confirm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PackageSection } from '../types'
import { SectionContentEditor } from './SectionContentEditor'

const api = vi.hoisted(() => ({ updatePassage: vi.fn(), deletePassage: vi.fn(), updateAudio: vi.fn(), deleteAudio: vi.fn(), uploadAudio: vi.fn() }))
vi.mock('../api/packageApi', () => api)
const section: PackageSection = {
  id: 'section', title: 'Reading 1', skill: null, sortOrder: 1, timeLimitSeconds: null, partNo: null,
  coverAssetId: null, instructions: null, passage: 'Đoạn văn đã lưu', audio: null, questions: [],
}
const uploaded = { mediaReference: 'content-audio/user/demo.mp3', mediaUrl: 'https://media.example/demo.mp3', contentType: 'audio/mpeg', sizeBytes: 42 }
const mutate = async (action: () => Promise<unknown>) => { await action(); return true }
function show(extra: Partial<React.ComponentProps<typeof SectionContentEditor>> = {}) {
  return render(<SectionContentEditor packageId="package" versionId="version" section={section} disabled={false} onSaved={vi.fn()} onMutate={mutate} {...extra} />)
}
/** The section shows what it holds; each form opens in a dialog from its button. */
function openPassage() { fireEvent.click(screen.getByRole('button', { name: /^(Thêm|Sửa) đoạn văn$/ })) }
function openAudio() { fireEvent.click(screen.getByRole('button', { name: /^(Thêm|Sửa) audio$/ })) }
/** The browser reads the length of a chosen file through a detached audio element; the test plays that part. */
const createElement = document.createElement.bind(document)
let probe: HTMLAudioElement | undefined
function chooseFile() {
  fireEvent.change(screen.getByLabelText('File audio'), { target: { files: [new File(['audio'], 'demo.mp3', { type: 'audio/mpeg' })] } })
}
function readLength(seconds: number) {
  Object.defineProperty(probe, 'duration', { value: seconds, configurable: true })
  act(() => { probe!.onloadedmetadata?.(new Event('loadedmetadata')) })
}

describe('SectionContentEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks(); api.uploadAudio.mockResolvedValue(uploaded); api.updatePassage.mockResolvedValue({ passage: 'Mới' }); api.updateAudio.mockResolvedValue({})
    URL.createObjectURL = vi.fn(() => 'blob:demo'); URL.revokeObjectURL = vi.fn()
    probe = undefined
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string, options?: ElementCreationOptions) => {
      const element = createElement(tag, options)
      if (tag === 'audio') probe = element as HTMLAudioElement
      return element
    }) as typeof document.createElement)
  })

  it.each([
    ['READING', true, false],
    ['WRITING', false, false],
    ['LISTENING', false, true],
    ['SPEAKING', false, false],
    [null, true, true],
  ] as const)('for a %s section offers the passage: %s, the audio: %s', (skill, passage, audio) => {
    show({ section: { ...section, skill, passage: null, audio: null } })
    expect(!!screen.queryByRole('button', { name: 'Thêm đoạn văn' })).toBe(passage)
    expect(!!screen.queryByRole('button', { name: 'Thêm audio' })).toBe(audio)
  })

  it('shows the audio and its transcript without a form, and offers editing only when it is allowed', () => {
    const audio = { assetId: 'a', mediaReference: 'listening/demo/a.mp3', mediaUrl: 'https://media.example/a.mp3', durationSeconds: 30, transcript: 'Caller: Hello.' }
    const { rerender } = show({ section: { ...section, skill: 'LISTENING', passage: null, audio } })
    expect(screen.getByLabelText('Nghe audio của Reading 1')).toBeInTheDocument()
    expect(screen.getByText('Caller: Hello.')).toBeInTheDocument()
    expect(screen.queryByLabelText('File audio')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sửa audio' })).toBeInTheDocument()
    rerender(<SectionContentEditor packageId="package" versionId="version" section={{ ...section, skill: 'LISTENING', passage: null, audio }} disabled onSaved={vi.fn()} onMutate={mutate} />)
    expect(screen.queryByRole('button', { name: 'Sửa audio' })).not.toBeInTheDocument()
  })

  it('keeps the audio of a Reading section visible so it can be removed', () => {
    show({ section: { ...section, skill: 'READING', passage: null, audio: { assetId: 'a', mediaReference: 'listening/demo/a.mp3', mediaUrl: null, durationSeconds: 30, transcript: null } } })
    expect(screen.getByRole('button', { name: 'Sửa audio' })).toBeInTheDocument()
  })

  it('saves only the controlled passage and preserves unsaved input across parent reloads', async () => {
    const { rerender } = show()
    openPassage()
    fireEvent.change(screen.getByLabelText('Nội dung đoạn văn'), { target: { value: 'Đoạn đang soạn' } })
    rerender(<SectionContentEditor packageId="package" versionId="version" section={{ ...section, passage: 'Dữ liệu mới từ phần khác' }} disabled={false} onSaved={vi.fn()} onMutate={mutate} />)
    expect(screen.getByLabelText('Nội dung đoạn văn')).toHaveValue('Đoạn đang soạn')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đoạn văn' }))
    await waitFor(() => expect(api.updatePassage).toHaveBeenCalledWith('package', 'version', section.id, { text: 'Đoạn đang soạn' }))
    expect(api.updateAudio).not.toHaveBeenCalled()
  })

  it('confirms before removing a passage and blocks oversized audio before upload', async () => {
    show()
    openPassage()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ đoạn văn' }))
    await answerConfirm(false)
    expect(api.deletePassage).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ đoạn văn' }))
    await answerConfirm(true)
    await waitFor(() => expect(api.deletePassage).toHaveBeenCalledWith('package', 'version', section.id))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Gỡ đoạn văn' })).not.toBeInTheDocument())
    openAudio()
    const file = new File(['audio'], 'big.mp3', { type: 'audio/mpeg' })
    Object.defineProperty(file, 'size', { value: 25 * 1024 * 1024 + 1 })
    fireEvent.change(screen.getByLabelText('File audio'), { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('File lớn hơn 25 MiB')
    expect(screen.getByRole('button', { name: 'Lưu audio' })).toBeDisabled()
    expect(api.uploadAudio).not.toHaveBeenCalled()
  })

  it('asks for a file when the section has no audio yet', async () => {
    show()
    openAudio()
    fireEvent.change(screen.getByLabelText('Thời lượng audio (giây)'), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu audio' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Chọn file audio.')
    expect(api.uploadAudio).not.toHaveBeenCalled()
    expect(api.updateAudio).not.toHaveBeenCalled()
  })

  it('reads the rounded-up length from the chosen file, then uploads and attaches it with the transcript in one save', async () => {
    show()
    openAudio()
    chooseFile()
    readLength(44.2)
    expect(screen.getByLabelText('Thời lượng audio (giây)')).toHaveValue(45)
    expect(api.uploadAudio).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Transcript (tùy chọn)'), { target: { value: 'Nội dung nghe' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu audio' }))
    await waitFor(() => expect(api.updateAudio).toHaveBeenCalledWith('package', 'version', section.id, { mediaReference: uploaded.mediaReference, durationSeconds: 45, transcript: 'Nội dung nghe' }))
  })

  it('keeps a typed duration against a late file read and keeps the form if saving fails', async () => {
    const guardedMutate = async (action: () => Promise<unknown>) => { try { await action(); return true } catch { return false } }
    api.updateAudio.mockRejectedValue(new Error('Lưu thất bại'))
    show({ onMutate: guardedMutate })
    openAudio()
    chooseFile()
    fireEvent.change(screen.getByLabelText('Thời lượng audio (giây)'), { target: { value: '12' } })
    readLength(44.2)
    expect(screen.getByLabelText('Thời lượng audio (giây)')).toHaveValue(12)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu audio' }))
    await waitFor(() => expect(api.updateAudio).toHaveBeenCalled())
    expect(screen.getByLabelText('Thời lượng audio (giây)')).toHaveValue(12)
  })

  it('locks all content writes while saving and ignores completion after unmount', async () => {
    let resolve!: (value: typeof uploaded) => void
    api.uploadAudio.mockReturnValueOnce(new Promise((resolveRequest) => { resolve = resolveRequest }))
    const onSaved = vi.fn()
    const { unmount } = show({ onSaved })
    openAudio()
    chooseFile()
    readLength(30)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu audio' }))
    expect(screen.getByRole('button', { name: 'Đang lưu…' })).toBeDisabled()
    expect(screen.getByLabelText('Transcript (tùy chọn)')).toBeDisabled()
    unmount()
    await act(async () => resolve(uploaded))
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('rejects unsafe media playback URLs and invalid manual durations', async () => {
    show({ section: { ...section, audio: { assetId: 'asset', mediaReference: 'listening/seed.mp3', mediaUrl: 'javascript:alert(1)', durationSeconds: 45, transcript: null } } })
    expect(screen.queryByLabelText('Nghe audio của Reading 1')).not.toBeInTheDocument()
    expect(screen.getByText(/Audio chưa có địa chỉ phát hợp lệ/)).toBeInTheDocument()
    openAudio()
    fireEvent.change(screen.getByLabelText('Thời lượng audio (giây)'), { target: { value: '7201' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu audio' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('từ 1 đến 7.200 giây')
    expect(api.updateAudio).not.toHaveBeenCalled()
  })
})
