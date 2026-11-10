import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { OverviewHome } from './OverviewHome'

const fixture = vi.hoisted(() => ({ account: 'learner-1' }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => ({ userName: 'Học viên', userId: fixture.account, email: `${fixture.account}@example.test` }) }))
vi.mock('./OverviewGeneralStats', () => ({ OverviewGeneralStats: () => null }))
vi.mock('../hooks/useOverviewData', () => ({ useOverviewData: () => {
  const resource = { data: null, loading: false, error: null, reload: vi.fn() }
  return {
    today: new Date(), profile: resource, report: resource, learning: resource, streak: resource, time: resource,
    progress: { ...resource, data: { courses: [
      { courseId: 'older', name: 'IELTS 6.0', completedLessons: 3, totalLessons: 10, percent: 30, startedAt: '2026-10-01T08:00:00Z', lastStudiedAt: '2026-10-02T08:00:00Z' },
      { courseId: 'recent', name: 'IELTS 7.0', completedLessons: 2, totalLessons: 14, percent: 14, startedAt: '2026-11-01T08:00:00Z', lastStudiedAt: '2026-11-06T08:00:00Z' },
    ] } },
  }
} }))

function Destination() { return <p>{useLocation().pathname}</p> }
function App() {
  return <MemoryRouter initialEntries={['/overview']}><Routes><Route path="/overview" element={<OverviewHome />} /><Route path="/learn/courses/:id" element={<Destination />} /></Routes></MemoryRouter>
}
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
beforeAll(() => Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }))
afterAll(() => {
  if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})
beforeEach(() => { fixture.account = 'learner-1' })

describe('overview selected course', () => {
  it('defaults to the most recent course and continues into the manually selected course', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('combobox')).toHaveTextContent('IELTS 7.0')
    screen.getByRole('combobox').focus()
    await user.keyboard('{Enter}{End}{Enter}')
    expect(screen.getByRole('combobox')).toHaveTextContent('IELTS 6.0')
    await user.click(screen.getByRole('button', { name: 'Tiếp tục học' }))
    expect(screen.getByText('/learn/courses/older')).toBeVisible()
  })

  it('resets a manual choice when the authenticated account changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<App />)
    screen.getByRole('combobox').focus()
    await user.keyboard('{Enter}{End}{Enter}')
    expect(screen.getByRole('combobox')).toHaveTextContent('IELTS 6.0')
    fixture.account = 'learner-2'
    rerender(<App />)
    expect(screen.getByRole('combobox')).toHaveTextContent('IELTS 7.0')
  })
})
