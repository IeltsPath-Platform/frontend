import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { WritingResultPage } from './WritingResultPage'

vi.mock('@/components/SiteNavbar', () => ({
  SiteNavbar: ({ activePath }: { activePath?: string }) => <nav aria-label="Menu" data-active={activePath} />,
}))

const submissionId = '30000000-0000-4000-8000-000000000009'
const graded = {
  submissionId, status: 'GRADED', task: 'TASK_1', wordCount: 8, overallBand: 4, essayText: 'The figure have rose.',
  criteria: [{ code: 'TA', band: 3, strengths: [], improvements: [] }, { code: 'LR', band: 5, strengths: [], improvements: [] }],
  corrections: [],
}
const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

function show(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/practice/writing/submissions/${submissionId}/result${search}`]}>
      <Routes>
        <Route path="/practice/writing/submissions/:submissionId/result" element={<WritingResultPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('the result of a graded essay', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname
      return path === `/api/learning/writing-submissions/${submissionId}` ? json(graded) : json({})
    })
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('test-access-token')
  })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('sits under "Lịch sử nộp bài" like the menu does: the trail and the lit menu item agree', async () => {
    show()

    const trail = await screen.findByRole('navigation', { name: 'Đường dẫn trang' })
    expect(within(trail).getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/home')
    expect(within(trail).getByRole('link', { name: 'Lịch sử nộp bài' })).toHaveAttribute('href', '/submission-history')
    expect(within(trail).getByText('Kết quả bài viết')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('navigation', { name: 'Menu' })).toHaveAttribute('data-active', '/submission-history')
  })

  it('returns to the tab of the list it was opened from', async () => {
    show('?from=%2Fsubmission-history%3Ftab%3Dpractice%26skill%3Dwriting')

    const trail = await screen.findByRole('navigation', { name: 'Đường dẫn trang' })
    expect(within(trail).getByRole('link', { name: 'Lịch sử nộp bài' })).toHaveAttribute('href', '/submission-history?tab=practice&skill=writing')
  })

  it('ignores an origin the app does not know', async () => {
    show('?from=%2Fadmin')

    const trail = await screen.findByRole('navigation', { name: 'Đường dẫn trang' })
    expect(within(trail).getByRole('link', { name: 'Lịch sử nộp bài' })).toHaveAttribute('href', '/submission-history')
  })

  it('has no bar with a close button above the page: the trail is the way out', async () => {
    show()

    await screen.findByRole('navigation', { name: 'Đường dẫn trang' })
    expect(screen.queryByRole('link', { name: /^Về / })).not.toBeInTheDocument()
    expect(document.querySelector('.wr-top, .rw-exit')).toBeNull()
  })
})
