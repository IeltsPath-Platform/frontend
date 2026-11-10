import { renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openPracticeSession } from './practiceSessionApi'
import { usePracticeSession } from './usePracticeSession'

vi.mock('./practiceSessionApi', () => ({ openPracticeSession: vi.fn() }))

describe('usePracticeSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requests a session with a stable request id and returns its id', async () => {
    vi.mocked(openPracticeSession).mockResolvedValue({ id: 'practice-id', kind: 'WRITING', expiresAt: 'later' })
    const { result } = renderHook(() => usePracticeSession('WRITING', true), { wrapper: StrictMode })
    await waitFor(() => expect(result.current).toBe('practice-id'))

    const requests = vi.mocked(openPracticeSession).mock.calls
    expect(requests.length).toBeGreaterThan(0)
    expect(new Set(requests.map(([requestId]) => requestId)).size).toBe(1)
    expect(requests).toEqual(expect.arrayContaining([
      expect.arrayContaining([expect.any(String), 'WRITING', expect.any(AbortSignal)]),
    ]))
  })

  it('returns null when the request fails', async () => {
    vi.mocked(openPracticeSession).mockRejectedValue(new Error('unavailable'))
    const { result } = renderHook(() => usePracticeSession('SPEAKING', true))
    await waitFor(() => expect(openPracticeSession).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current).toBeNull())
  })

  it('does not request a session while disabled', () => {
    renderHook(() => usePracticeSession('VOCABULARY', false))
    expect(openPracticeSession).not.toHaveBeenCalled()
  })
})
