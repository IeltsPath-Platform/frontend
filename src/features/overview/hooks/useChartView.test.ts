import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChartView } from './useChartView'

const session = vi.hoisted(() => ({ isLoggedIn: true, email: 'learner@example.test' }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => session }))

interface Props { key: string; data: { value: number } | null; pending: boolean; scope: string }
const initial: Props = { key: 'all', data: { value: 1 }, pending: false, scope: 'window' }
const renderView = () => renderHook(({ key, data, pending, scope }: Props) => useChartView(key, data, pending, scope), { initialProps: initial })

beforeEach(() => { session.email = 'learner@example.test'; session.isLoggedIn = true })

describe('retained chart view', () => {
  it('retains the original data and filter until the replacement arrives', () => {
    const { result, rerender } = renderView()
    rerender({ ...initial, key: 'course-1', data: null, pending: true })
    expect(result.current.view).toEqual({ key: 'all', data: initial.data })
    expect(result.current.updating).toBe(true)
    const next = { value: 2 }
    rerender({ ...initial, key: 'course-1', data: next })
    expect(result.current.view).toEqual({ key: 'course-1', data: next })
    expect(result.current.updating).toBe(false)
  })

  it('does not restore a snapshot after switching away and back to the same account', () => {
    const { result, rerender } = renderView()
    session.email = 'other@example.test'
    rerender({ ...initial, data: null, pending: true })
    expect(result.current.view).toBeNull()
    session.email = 'learner@example.test'
    rerender({ ...initial, data: null, pending: true })
    expect(result.current.view).toBeNull()
  })

  it('clears the snapshot when signing out or changing the data scope', () => {
    const { result, rerender } = renderView()
    session.isLoggedIn = false
    rerender({ ...initial, data: null, pending: true })
    expect(result.current.view).toBeNull()
    session.isLoggedIn = true
    rerender(initial)
    rerender({ ...initial, scope: 'other-window', data: null, pending: true })
    expect(result.current.view).toBeNull()
    rerender({ ...initial, data: null, pending: true })
    expect(result.current.view).toBeNull()
  })

  it('does not hide an error or unavailable result behind a retained chart', () => {
    const { result, rerender } = renderView()
    rerender({ ...initial, key: 'course-1', data: null, pending: false })
    expect(result.current.view).toBeNull()
    expect(result.current.updating).toBe(false)
  })
})
