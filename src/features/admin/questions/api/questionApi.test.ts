import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '@/lib/httpClient'
import { listQuestions } from './questionApi'

vi.mock('@/lib/httpClient', () => ({ apiRequest: vi.fn() }))

describe('listQuestions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('serializes lesson chooser filters and parses older responses without preview fields', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      content: [{ id: 'q1', code: 'Q-1', questionType: 'MULTIPLE_CHOICE', status: 'PUBLISHED', currentPublishedVersionId: 'v1' }],
      page: 0, size: 25, totalElements: 1, totalPages: 1,
    })
    const signal = new AbortController().signal

    const page = await listQuestions({
      status: 'PUBLISHED', purpose: 'LEARNING', skill: 'LISTENING', code: 'Q-1', page: 0, size: 25,
      include: 'ownership,preview', exceptBlockId: 'block-1', onlyFree: true,
    }, signal)

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/content/admin/questions?status=PUBLISHED&purpose=LEARNING&skill=LISTENING&code=Q-1&page=0&size=25&include=ownership%2Cpreview&exceptBlockId=block-1&onlyFree=true',
      { auth: true, signal },
    )
    expect(page.content[0]?.knowledgePoints).toBeUndefined()
    expect(page.content[0]?.ownedElsewhere).toBeUndefined()
  })
})
