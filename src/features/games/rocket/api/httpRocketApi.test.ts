import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '@/lib/httpClient'
import { createHttpRocketApi } from './httpRocketApi'

vi.mock('@/lib/httpClient', () => ({ apiRequest: vi.fn() }))

const request = vi.mocked(apiRequest)

describe('http rocket api', () => {
  beforeEach(() => request.mockReset())

  it('starts solo play with a Rocket room, then the shared ready and start routes', async () => {
    request
      .mockResolvedValueOnce({ id: 'room-1' })
      .mockResolvedValueOnce({ id: 'room-1' })
      .mockResolvedValueOnce({ matchId: 'match-1' })
    await expect(createHttpRocketApi().startSolo({ questionCount: 8 })).resolves.toEqual({ matchId: 'match-1' })
    expect(request.mock.calls.map(([path, options]) => [path, options?.method, options?.body])).toEqual([
      ['/api/games/rocket/rooms', 'POST', { playerMode: 'SOLO', questionCount: 8 }],
      ['/api/games/rooms/room-1/ready', 'POST', { ready: true }],
      ['/api/games/rooms/room-1/start', 'POST', undefined],
    ])
    expect(request.mock.calls.every(([, options]) => options?.auth)).toBe(true)
  })

  it('uses the Rocket round routes and the shared match leave and result routes', async () => {
    request.mockResolvedValue({})
    const api = createHttpRocketApi()
    await api.current('m 1')
    await api.answer('m 1', 'r/1', { requestId: 'req', optionId: 'opt' })
    await api.leave('m 1')
    await api.result('m 1')
    expect(request.mock.calls.map(([path, options]) => [path, options?.method ?? 'GET', options?.body])).toEqual([
      ['/api/games/rocket/matches/m%201/rounds/current', 'GET', undefined],
      ['/api/games/rocket/matches/m%201/rounds/r%2F1/answers', 'POST', { requestId: 'req', optionId: 'opt' }],
      ['/api/games/matches/m%201/leave', 'POST', undefined],
      ['/api/games/matches/m%201/result', 'GET', undefined],
    ])
  })
})
