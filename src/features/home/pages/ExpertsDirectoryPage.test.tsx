import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken } from '@/lib/httpClient'
import { SEEDED_EXAMINERS } from '../examinerPublicApi'
import { ExpertsDirectoryPage } from './ExpertsDirectoryPage'

vi.mock('@/components/SiteNavbar', () => ({
  SiteNavbar: () => <header data-testid="site-navbar" />,
}))

const fetchMock = vi.fn<typeof fetch>()
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const MOCK_API_EXAMINERS = [
  {
    id: '00000000-0000-0000-0000-000000000003',
    displayName: 'THẠC SĨ LINH PHƯƠNG',
    avatarUrl: 'Buckets/avatars/images/00000000-0000-0000-0000-000000000003/linh-phuong.png',
    bio: 'Chuyên sâu chấm chữa Writing học thuật & Listening.',
    ieltsBand: 8.5,
    certificates: [
      { name: 'IELTS Academic', issuer: 'IDP Education', year: 2023, score: '8.5 Overall' },
      { name: 'CELTA', issuer: 'Cambridge', year: 2018, score: 'Pass A' },
    ],
    acceptingSubmissions: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    displayName: 'GIẢNG VIÊN YẾN CHI',
    avatarUrl: 'Buckets/avatars/images/00000000-0000-0000-0000-000000000004/yen-chi.webp',
    bio: 'Chuyên gia Speaking & Coherence.',
    ieltsBand: 8.5,
    certificates: [
      { name: 'IELTS Academic (2x 8.5)', issuer: 'IDP Education', year: 2023, score: '8.5 Overall' },
    ],
    acceptingSubmissions: false,
  },
]

describe('ExpertsDirectoryPage (/mentors)', () => {
  beforeEach(() => {
    clearAccessToken()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders the list of examiners from mock API and links cards to /mentors/{id}', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(MOCK_API_EXAMINERS))

    render(
      <MemoryRouter initialEntries={['/mentors']}>
        <ExpertsDirectoryPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: /Học cùng những chuyên gia IELTS tận tâm nhất/i })).toBeInTheDocument()

    const list = await screen.findByRole('list', { name: 'Danh sách chuyên gia' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)

    const firstCardLink = within(list).getByRole('link', { name: /Xem hồ sơ THẠC SĨ LINH PHƯƠNG/i })
    expect(firstCardLink).toHaveAttribute('href', `/mentors/${MOCK_API_EXAMINERS[0].id}`)

    const secondCardLink = within(list).getByRole('link', { name: /Xem hồ sơ GIẢNG VIÊN YẾN CHI/i })
    expect(secondCardLink).toHaveAttribute('href', `/mentors/${MOCK_API_EXAMINERS[1].id}`)

    expect(screen.queryByText('Đang hiển thị dữ liệu mẫu')).not.toBeInTheDocument()
  })

  it('filters examiners by skill chip and hides the featured block when only 1 result remains', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(MOCK_API_EXAMINERS))

    render(
      <MemoryRouter initialEntries={['/mentors']}>
        <ExpertsDirectoryPage />
      </MemoryRouter>,
    )

    await screen.findByRole('list', { name: 'Danh sách chuyên gia' })
    expect(screen.getByTestId('featured-examiner-card')).toBeInTheDocument()

    const speakingChip = screen.getByRole('button', { name: 'Speaking' })
    expect(speakingChip).toHaveAttribute('aria-pressed', 'false')

    await user.click(speakingChip)
    expect(speakingChip).toHaveAttribute('aria-pressed', 'true')

    const list = screen.getByRole('list', { name: 'Danh sách chuyên gia' })
    expect(within(list).getByText('GIẢNG VIÊN YẾN CHI')).toBeInTheDocument()
    expect(within(list).queryByText('THẠC SĨ LINH PHƯƠNG')).not.toBeInTheDocument()

    // Featured block hides when filtering leaves only 1 result
    expect(screen.queryByTestId('featured-examiner-card')).not.toBeInTheDocument()
  })

  it('filters examiners using the "Chỉ hiện chuyên gia đang nhận bài" switch', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(MOCK_API_EXAMINERS))

    render(
      <MemoryRouter initialEntries={['/mentors']}>
        <ExpertsDirectoryPage />
      </MemoryRouter>,
    )

    await screen.findByRole('list', { name: 'Danh sách chuyên gia' })

    const acceptingSwitch = screen.getByRole('switch', { name: /Chỉ hiện chuyên gia đang nhận bài/i })
    expect(acceptingSwitch).toHaveAttribute('aria-checked', 'false')

    await user.click(acceptingSwitch)
    expect(acceptingSwitch).toHaveAttribute('aria-checked', 'true')

    const list = screen.getByRole('list', { name: 'Danh sách chuyên gia' })
    expect(within(list).getByText('THẠC SĨ LINH PHƯƠNG')).toBeInTheDocument()
    expect(within(list).queryByText('GIẢNG VIÊN YẾN CHI')).not.toBeInTheDocument()
  })

  it('falls back to SEEDED_EXAMINERS and shows notice when API fails (e.g. 401)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401))

    render(
      <MemoryRouter initialEntries={['/mentors']}>
        <ExpertsDirectoryPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Đang hiển thị dữ liệu mẫu')).toBeInTheDocument()

    const list = screen.getByRole('list', { name: 'Danh sách chuyên gia' })
    for (const seeded of SEEDED_EXAMINERS) {
      expect(within(list).getByText(seeded.displayName)).toBeInTheDocument()
    }
  })

  it('shows empty filter state and resets filters when clicking "Xóa bộ lọc"', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(MOCK_API_EXAMINERS))

    render(
      <MemoryRouter initialEntries={['/mentors']}>
        <ExpertsDirectoryPage />
      </MemoryRouter>,
    )

    await screen.findByRole('list', { name: 'Danh sách chuyên gia' })

    const readingChip = screen.getByRole('button', { name: 'Reading' })
    await user.click(readingChip)

    expect(screen.getByText(/Không tìm thấy chuyên gia phù hợp/i)).toBeInTheDocument()
    const resetBtn = screen.getByRole('button', { name: /Xóa bộ lọc/i })
    await user.click(resetBtn)

    expect(readingChip).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Tất cả' })).toHaveAttribute('aria-pressed', 'true')
    const listAfterReset = screen.getByRole('list', { name: 'Danh sách chuyên gia' })
    expect(within(listAfterReset).getAllByRole('listitem')).toHaveLength(2)
  })
})
