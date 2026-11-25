import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCatalogPackage, makeCatalogPage } from '../testFixtures'
import { PlacementTestsPage } from './PlacementTestsPage'

const api = vi.hoisted(() => ({
  listAllPackages: vi.fn(), listPackages: vi.fn(), listPracticeSources: vi.fn(), updatePackageInfo: vi.fn(), archivePackage: vi.fn(), restorePackage: vi.fn(),
  createPackage: vi.fn(), createDraftVersion: vi.fn(),
}))
const stats = vi.hoisted(() => ({ listPackageStats: vi.fn() }))
vi.mock('../api/packageApi', () => api)
vi.mock('../api/packageStatsApi', () => stats)

const low = makeCatalogPackage({
  id: '00000000-0000-4000-8000-0000000000b1', code: 'PL-LOW', title: 'Entry low', packageType: 'PLACEMENT_TEST', placementPool: 'BAND_0_3',
  sectionCount: 3, questionCount: 30, status: 'PUBLISHED', accessLevel: 'FREE', sourceCode: null,
})
const mid = makeCatalogPackage({
  id: '00000000-0000-4000-8000-0000000000b2', code: 'PL-MID', title: 'Entry mid', packageType: 'PLACEMENT_TEST', placementPool: 'BAND_3_5',
  sectionCount: 2, questionCount: 20, status: 'DRAFT', currentPublishedVersionId: null, accessLevel: 'FREE', sourceCode: null,
})
const high = makeCatalogPackage({
  id: '00000000-0000-4000-8000-0000000000b3', code: 'PL-HIGH', title: 'Entry high', packageType: 'PLACEMENT_TEST', placementPool: 'BAND_5_9',
  sectionCount: 4, questionCount: 40, status: 'PUBLISHED', accessLevel: 'FREE', sourceCode: null,
})

function show() {
  return render(<MemoryRouter initialEntries={['/content-author/placement-tests']}><PlacementTestsPage /></MemoryRouter>)
}
function editFromMenu(code: string, title: string) {
  fireEvent.click(screen.getByRole('button', { name: `Hành động của ${code}` }))
  fireEvent.click(screen.getByRole('menuitem', { name: `Sửa thông tin ${title}` }))
}

describe('PlacementTestsPage', () => {
  beforeEach(() => {
    const tests = [low, mid, high]
    api.listAllPackages.mockReset().mockResolvedValue(tests)
    // The summary asks the server for the published count of each pool, one request per pool.
    api.listPackages.mockReset().mockImplementation((filters) => Promise.resolve(makeCatalogPage([], {
      size: 1, totalElements: tests.filter((test) => test.status === 'PUBLISHED' && test.placementPool === filters.placementPool).length,
    })))
    api.listPracticeSources.mockReset().mockResolvedValue([])
    api.updatePackageInfo.mockReset().mockResolvedValue(mid)
    stats.listPackageStats.mockReset().mockResolvedValue([])
  })

  it('shows how many published tests each band pool has, and warns about the empty one', async () => {
    show()

    expect(await screen.findByRole('link', { name: /Entry low/ })).toBeInTheDocument()
    // The counts come from one request per pool, so they arrive after the table.
    expect(await screen.findByText('Chưa có đề, học viên không chọn được kho này')).toBeInTheDocument()
    expect(screen.getAllByText('Cần thêm đề: lượt thi lại sẽ lặp đề')).toHaveLength(2)
  })

  it('filters the table by the pool tab', async () => {
    show()
    await screen.findByRole('link', { name: /Entry low/ })

    fireEvent.click(screen.getByRole('tab', { name: /Band 3–5/ }))

    expect(screen.getByRole('link', { name: /Entry mid/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Entry low/ })).not.toBeInTheDocument()
  })

  it('locks the band pool of a published test and leaves a draft one free to move', async () => {
    show()
    await screen.findByRole('link', { name: /Entry high/ })

    editFromMenu('PL-HIGH', 'Entry high')
    expect(await screen.findByRole('combobox', { name: /Kho band/ })).toBeDisabled()
  })

  it('moves a draft placement test to another pool', async () => {
    show()
    await screen.findByRole('link', { name: /Entry mid/ })

    editFromMenu('PL-MID', 'Entry mid')
    const dialog = await screen.findByRole('form', { name: 'Sửa thông tin gói' })
    const pool = within(dialog).getByRole('combobox', { name: /Kho band/ })
    expect(pool).toBeEnabled()
    fireEvent.change(pool, { target: { value: 'BAND_5_9' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.updatePackageInfo).toHaveBeenCalledWith(mid.id, { placementPool: 'BAND_5_9' }))
  })
})
