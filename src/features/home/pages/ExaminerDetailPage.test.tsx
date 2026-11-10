import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken } from '@/lib/httpClient'
import { TeacherSection } from '../components/TeacherSection'
import { resolveSupabaseAvatarUrl, SUPABASE_AVATARS_BUCKET_URL } from '../examinerPublicApi'
import { ExaminerDetailPage } from './ExaminerDetailPage'

vi.mock('@/components/SiteNavbar', () => ({
  SiteNavbar: () => <header data-testid="site-navbar" />,
}))

const fetchMock = vi.fn<typeof fetch>()
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const DB_EXAMINERS = [
  {
    id: '00000000-0000-0000-0000-000000000003',
    displayName: 'Thạc Sĩ Linh Phương',
    avatarUrl: 'Buckets/avatars/images/00000000-0000-0000-0000-000000000003/linh-phuong.png',
    bio: '12 năm kinh nghiệm giảng dạy IELTS học thuật chuyên sâu.',
    ieltsBand: 8.5,
    certificates: [
      { name: 'IELTS Academic', issuer: 'IDP Education', year: 2023, score: '8.5 Overall' },
      { name: 'CELTA', issuer: 'Cambridge Assessment English', year: 2018, score: 'Pass A' },
    ],
    acceptingSubmissions: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    displayName: 'Giảng Viên Minh Khôi',
    avatarUrl: `${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000004/minh-khoi.webp`,
    bio: 'Chuyên gia chấm chữa Writing & Speaking chuẩn 4 tiêu chí quốc tế.',
    ieltsBand: 8.5,
    certificates: [
      { name: 'DELTA Module 1-3', issuer: 'Cambridge English', year: 2021, score: 'Distinction' },
    ],
    acceptingSubmissions: true,
  },
]

describe('Supabase avatar URL resolver & Public Examiner Pages', () => {
  beforeEach(() => {
    clearAccessToken()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves Buckets/avatars/... and relative keys into Supabase public bucket URLs', () => {
    expect(
      resolveSupabaseAvatarUrl('Buckets/avatars/images/00000000-0000-0000-0000-000000000003/linh-phuong.png'),
    ).toBe(`${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000003/linh-phuong.png`)

    expect(
      resolveSupabaseAvatarUrl('avatars/images/u1/avatar.webp'),
    ).toBe(`${SUPABASE_AVATARS_BUCKET_URL}/images/u1/avatar.webp`)

    expect(
      resolveSupabaseAvatarUrl('https://kndrsdqzbzsaiuuruqno.supabase.co/storage/v1/object/public/avatars/images/u1/a.png'),
    ).toBe('https://kndrsdqzbzsaiuuruqno.supabase.co/storage/v1/object/public/avatars/images/u1/a.png')
  })

  it('TeacherSection on HomePage loads real examiners from GET /api/users/examiners without login', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input))
      if (url.pathname === '/api/users/examiners') return jsonResponse(DB_EXAMINERS)
      return jsonResponse({}, 404)
    })

    render(
      <MemoryRouter initialEntries={['/home']}>
        <TeacherSection />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Giảng Viên Minh Khôi')).toBeInTheDocument()
    const img = screen.getByAltText('Chân dung Thạc Sĩ Linh Phương') as HTMLImageElement
    expect(img.src).toBe(`${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000003/linh-phuong.png`)
  })

  it('ExaminerDetailPage renders database examiner profile, certificates and Supabase avatar for guests without login', async () => {
    const targetId = '00000000-0000-0000-0000-000000000004'
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input))
      if (url.pathname === `/api/users/examiners/${targetId}`) return jsonResponse(DB_EXAMINERS[1])
      if (url.pathname === '/api/users/examiners') return jsonResponse(DB_EXAMINERS)
      return jsonResponse({}, 404)
    })

    render(
      <MemoryRouter initialEntries={[`/mentors/${targetId}`]}>
        <Routes>
          <Route path="/mentors/:mentorSlug" element={<ExaminerDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Giảng Viên Minh Khôi' })).toBeInTheDocument()
    expect(screen.getAllByText('DELTA Module 1-3').length).toBeGreaterThan(0)
    expect(screen.getByText(/Kết quả: Distinction/)).toBeInTheDocument()
    const portrait = screen.getByAltText('Chân dung giảng viên Giảng Viên Minh Khôi') as HTMLImageElement
    expect(portrait.src).toBe(`${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000004/minh-khoi.webp`)
  })
})
