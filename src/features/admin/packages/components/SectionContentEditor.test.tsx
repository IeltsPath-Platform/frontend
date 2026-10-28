import { act, fireEvent, render, screen, waitFor } from '@/test/render'
import { answerConfirm } from '@/test/confirm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PackageSection } from '../types'
import { SectionContentEditor } from './SectionContentEditor'

const api = vi.hoisted(() => ({ updatePassage: vi.fn(), deletePassage: vi.fn(), updateAudio: vi.fn(), deleteAudio: vi.fn(), uploadAudio: vi.fn() }))
vi.mock('../api/packageApi', () => api)
const section: PackageSection = {
  id: 'section', title: 'Reading 1', skill: 'READING', sortOrder: 1, timeLimitSeconds: null, partNo: null,
  coverAssetId: null, instructions: null, passage: 'Đoạn văn đã lưu', audio: null, questions: [],
}
const uploaded = { mediaReference: 'content-audio/user/demo.mp3', mediaUrl: 'https://media.example/demo.mp3', contentType: 'audio/mpeg', sizeBytes: 42 }
const mutate = async (action: () => Promise<unknown>) => { await action(); return true }
function show(extra: Partial<React.ComponentProps<typeof SectionContentEditor>> = {}) {
  return render(<SectionContentEditor packageId="package" versionId="version" section={section} disabled={false} onSaved={vi.fn()} onMutate={mutate} {...extra} />)
}
function uploadFile() {
  fireEvent.change(screen.getByLabelText('File audio'), { target: { files: [new File(['audio'], 'demo.mp3', { type: 'audio/mpeg' })] } })
  fireEvent.click(screen.getByRole('button', { name: 'Tải file audio' }))
}

describe('SectionContentEditor', () => {
  beforeEach(() => { vi.clearAllMocks(); api.uploadAudio.mockResolvedValue(uploaded); api.updatePassage.mockResolvedValue({ passage: 'Mới' }); api.updateAudio.mockResolvedValue({}) })

  it('saves only the controlled passage and preserves unsaved input across parent reloads', async () => {
    const { rerender } = show()
    fireEvent.change(screen.getByLabelText('Nội dung đoạn văn'), { target: { value: 'Đoạn đang soạn' } })
    rerender(<SectionContentEditor packageId="package" versionId="version" section={{ ...section, passage: 'Dữ liệu mới từ phần khác' }} disabled={false} onSaved={vi.fn()} onMutate={mutate} />)
    expect(screen.getByLabelText('Nội dung đoạn văn')).toHaveValue('Đoạn đang soạn')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đoạn văn' }))
    await waitFor(() => expect(api.updatePassage).toHaveBeenCalledWith('package', 'version', section.id, { text: 'Đoạn đang soạn' }))
    expect(api.updateAudio).not.toHaveBeenCalled()
  })

  it('confirms before removing a passage and blocks oversized audio before upload', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ đoạn văn' }))
    await answerConfirm(false)
    expect(api.deletePassage).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ đoạn văn' }))
    await answerConfirm(true)
    await waitFor(() => expect(api.deletePassage).toHaveBeenCalledWith('package', 'version', section.id))
    const file = new File(['audio'], 'big.mp3', { type: 'audio/mpeg' })
    Object.defineProperty(file, 'size', { value: 25 * 1024 * 1024 + 1 })
    fireEvent.change(screen.getByLabelText('File audio'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Tải file audio' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('File lớn hơn 25 MiB')
    expect(api.uploadAudio).not.toHaveBeenCalled()
  })

  it('reads rounded-up metadata after upload and attaches its retained key with the transcript', async () => {
    show()
    uploadFile()
    const metadata = await screen.findByLabelText('Đọc thời lượng audio tải lên')
    Object.defineProperty(metadata, 'duration', { value: 44.2 })
    fireEvent.loadedMetadata(metadata)
    expect(screen.getByLabelText('Thời lượng audio (giây)')).toHaveValue(45)
    expect(screen.getByLabelText('Key audio')).toHaveValue(uploaded.mediaReference)
    fireEvent.change(screen.getByLabelText('Transcript (tùy chọn)'), { target: { value: 'Nội dung nghe' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu audio' }))
    await waitFor(() => expect(api.updateAudio).toHaveBeenCalledWith('package', 'version', section.id, { mediaReference: uploaded.mediaReference, durationSeconds: 45, transcript: 'Nội dung nghe' }))
  })

  it('keeps manual duration against late metadata and keeps uploaded data if attaching fails', async () => {
    const guardedMutate = async (action: () => Promise<unknown>) => { try { await action(); return true } catch { return false } }
    api.updateAudio.mockRejectedValue(new Error('Lưu thất bại'))
    show({ onMutate: guardedMutate })
    uploadFile()
    const metadata = await screen.findByLabelText('Đọc thời lượng audio tải lên')
    fireEvent.change(screen.getByLabelText('Thời lượng audio (giây)'), { target: { value: '12' } })
    Object.defineProperty(metadata, 'duration', { value: 44.2 })
    fireEvent.loadedMetadata(metadata)
    expect(screen.getByLabelText('Thời lượng audio (giây)')).toHaveValue(12)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu audio' }))
    await waitFor(() => expect(api.updateAudio).toHaveBeenCalled())
    expect(screen.getByLabelText('Key audio')).toHaveValue(uploaded.mediaReference)
    expect(screen.getByLabelText('Thời lượng audio (giây)')).toHaveValue(12)
  })

  it('locks all content writes during upload and ignores completion after unmount', async () => {
    let resolve!: (value: typeof uploaded) => void
    api.uploadAudio.mockReturnValueOnce(new Promise((resolveRequest) => { resolve = resolveRequest }))
    const onSaved = vi.fn()
    const { unmount } = show({ onSaved })
    uploadFile()
    expect(screen.getByRole('button', { name: 'Lưu đoạn văn' })).toBeDisabled()
    expect(screen.getByLabelText('Transcript (tùy chọn)')).toBeDisabled()
    unmount()
    await act(async () => resolve(uploaded))
    expect(onSaved).not.toHaveBeenCalled()
    expect(api.updateAudio).not.toHaveBeenCalled()
  })

  it('rejects unsafe media playback URLs and invalid manual durations', async () => {
    show({ section: { ...section, audio: { assetId: 'asset', mediaReference: 'listening/seed.mp3', mediaUrl: 'javascript:alert(1)', durationSeconds: 45, transcript: null } } })
    expect(screen.queryByLabelText('Nghe audio của Reading 1')).not.toBeInTheDocument()
    expect(screen.getByText(/Audio chưa có địa chỉ phát hợp lệ/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Thời lượng audio (giây)'), { target: { value: '7201' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu audio' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('từ 1 đến 7.200 giây')
    expect(api.updateAudio).not.toHaveBeenCalled()
  })
})
