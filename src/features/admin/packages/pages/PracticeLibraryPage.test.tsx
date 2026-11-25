import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCatalogPackage } from '../testFixtures'
import { PracticeLibraryPage } from './PracticeLibraryPage'

const api = vi.hoisted(() => ({
  listAllPackages: vi.fn(), listPracticeSources: vi.fn(), updatePackageInfo: vi.fn(), archivePackage: vi.fn(), restorePackage: vi.fn(),
  createPackage: vi.fn(), createDraftVersion: vi.fn(),
}))
const stats = vi.hoisted(() => ({ listPackageStats: vi.fn() }))
vi.mock('../api/packageApi', () => api)
vi.mock('../api/packageStatsApi', () => stats)

const reading = makeCatalogPackage({
  id: '00000000-0000-4000-8000-0000000000a1', code: 'PT-R-1', title: 'Reading one', packageType: 'PRACTICE_TEST', skill: 'READING',
  partNos: [1, 2, 3], sectionCount: 3, questionCount: 40, accessLevel: 'FREE', sourceCode: 'IELTS_SPACE_PRO', status: 'PUBLISHED',
})
const listening = makeCatalogPackage({
  id: '00000000-0000-4000-8000-0000000000a2', code: 'PT-L-3', title: 'Listening three', packageType: 'PRACTICE_TEST', skill: 'LISTENING',
  partNos: [1], sectionCount: 1, questionCount: 20, accessLevel: 'PREMIUM', sourceCode: 'ACTUAL_TESTS', status: 'PUBLISHED',
})
const hidden = makeCatalogPackage({
  id: '00000000-0000-4000-8000-0000000000a3', code: 'PT-W-1', title: 'Writing one', packageType: 'PRACTICE_TEST', skill: 'WRITING',
  partNos: [1], sectionCount: 1, questionCount: 2, accessLevel: 'FREE', sourceCode: null, status: 'ARCHIVED', currentPublishedVersionId: null,
})

function show() {
  return render(<MemoryRouter initialEntries={['/content-author/practice-tests']}><PracticeLibraryPage /></MemoryRouter>)
}
function menuOf(code: string) {
  fireEvent.click(screen.getByRole('button', { name: `Hành động của ${code}` }))
}

describe('PracticeLibraryPage', () => {
  beforeEach(() => {
    api.listAllPackages.mockReset().mockResolvedValue([reading, listening, hidden])
    api.listPracticeSources.mockReset().mockResolvedValue([{ code: 'IELTS_SPACE_PRO', name: 'IELTS Space Pro' }, { code: 'ACTUAL_TESTS', name: 'Actual Tests' }])
    api.updatePackageInfo.mockReset().mockResolvedValue(reading)
    api.archivePackage.mockReset().mockResolvedValue({ ...reading, status: 'ARCHIVED' })
    api.restorePackage.mockReset().mockResolvedValue({ ...hidden, status: 'PUBLISHED' })
    stats.listPackageStats.mockReset().mockResolvedValue([{ packageId: reading.id, started: 5, submitted: 4, averageBand: 6.5 }])
  })

  it('lists the practice tests with their skill counts, access, source and attempt statistics', async () => {
    show()

    expect(await screen.findByRole('link', { name: /Reading one/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Nghe/ })).toHaveTextContent('1')
    expect(screen.getByText('3 đề · 1 Premium · 1 đang ẩn')).toBeInTheDocument()
    expect(screen.getByText('IELTS Space Pro')).toBeInTheDocument()
    expect(await screen.findByText('6.5')).toBeInTheDocument()
    expect(screen.getAllByText('5').length).toBeGreaterThan(0)
  })

  it('filters the table by the skill tab', async () => {
    show()
    await screen.findByRole('link', { name: /Reading one/ })

    fireEvent.click(screen.getByRole('tab', { name: /Nghe/ }))

    expect(screen.queryByRole('link', { name: /Reading one/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Listening three/ })).toBeInTheDocument()
  })

  it('hides a test only after confirmation, and brings a hidden one back', async () => {
    show()
    await screen.findByRole('link', { name: /Reading one/ })

    menuOf('PT-R-1')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ẩn Reading one' }))
    expect(api.archivePackage).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Ẩn' }))
    await waitFor(() => expect(api.archivePackage).toHaveBeenCalledWith(reading.id))

    // The dialog closes and the list reloads: the rest of the page is inert until then.
    fireEvent.click(await screen.findByRole('button', { name: 'Hành động của PT-W-1' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Khôi phục Writing one' }))
    await waitFor(() => expect(api.restorePackage).toHaveBeenCalledWith(hidden.id))
  })

  it('shows dashes in the attempt columns when the statistics cannot be read', async () => {
    stats.listPackageStats.mockRejectedValue(new Error('down'))
    show()

    await screen.findByRole('link', { name: /Reading one/ })
    expect(screen.getAllByText('—').length).toBeGreaterThan(1)
    expect(screen.getByRole('link', { name: /Reading one/ })).toBeInTheDocument()
  })

  it('sends only the fields that changed from the edit drawer', async () => {
    show()
    await screen.findByRole('link', { name: /Listening three/ })

    menuOf('PT-L-3')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sửa thông tin Listening three' }))
    const premium = await screen.findByRole('switch', { name: 'Chỉ học viên Premium làm được' })
    expect(premium).toBeChecked()
    fireEvent.click(premium)
    const dialog = screen.getByRole('form', { name: 'Sửa thông tin gói' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.updatePackageInfo).toHaveBeenCalledWith(listening.id, { accessLevel: 'FREE' }))
  })
})
