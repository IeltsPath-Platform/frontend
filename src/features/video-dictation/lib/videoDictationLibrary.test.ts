import { describe, expect, it } from 'vitest'
import type { DictationVideoListItem } from '../api/videoDictationApi'
import { filterVideos, formatDuration, groupByLevel, pickContinueVideo, playerPath, progressPercent } from './videoDictationLibrary'

const video = (over: Partial<DictationVideoListItem>): DictationVideoListItem => ({
  id: 'v', youtubeVideoId: 'y', title: 'Video', thumbnailUrl: null, durationSeconds: 60, level: 'A2',
  totalSegments: 10, passedSegments: 0, lastPracticedAt: null, ...over,
})

describe('groupByLevel', () => {
  it('orders groups A1 to C2 and leaves out empty levels', () => {
    const groups = groupByLevel([video({ id: '1', level: 'C1' }), video({ id: '2', level: 'A1' }), video({ id: '3', level: 'C1' })])

    expect(groups.map((group) => group.level)).toEqual(['A1', 'C1'])
    expect(groups[1].videos.map((item) => item.id)).toEqual(['1', '3'])
    expect(groups[0].label).toBe('Sơ cấp')
  })

  it('drops videos without a level', () => {
    expect(groupByLevel([video({ level: null })])).toEqual([])
  })
})

describe('filterVideos', () => {
  const list = [video({ id: '1', title: 'Ordering Food at a Café', level: 'A2' }), video({ id: '2', title: 'Remote Work', level: 'B2' })]

  it('filters by level and by title ignoring case and accents', () => {
    expect(filterVideos(list, 'B2', '').map((item) => item.id)).toEqual(['2'])
    expect(filterVideos(list, 'ALL', 'cafe').map((item) => item.id)).toEqual(['1'])
    expect(filterVideos(list, 'A2', 'remote')).toEqual([])
    expect(filterVideos(list, 'ALL', '  ').length).toBe(2)
  })
})

describe('pickContinueVideo', () => {
  it('offers the unfinished video practised most recently, not the first one in the list', () => {
    const videos = [
      video({ id: 'new' }),
      video({ id: 'done', passedSegments: 10, lastPracticedAt: '2026-10-20T09:00:00Z' }),
      video({ id: 'older', passedSegments: 2, lastPracticedAt: '2026-10-19T08:00:00Z' }),
      video({ id: 'latest', passedSegments: 3, lastPracticedAt: '2026-10-20T03:26:45Z' }),
      video({ id: 'middle', passedSegments: 1, lastPracticedAt: '2026-10-20T01:00:00Z' }),
    ]
    expect(pickContinueVideo(videos)?.id).toBe('latest')
  })

  it('falls back to the list order for videos without a practice time, which come after timed ones', () => {
    expect(pickContinueVideo([
      video({ id: 'first', passedSegments: 4 }),
      video({ id: 'second', passedSegments: 1 }),
    ])?.id).toBe('first')
    expect(pickContinueVideo([
      video({ id: 'untimed', passedSegments: 4 }),
      video({ id: 'timed', passedSegments: 1, lastPracticedAt: '2026-10-20T01:00:00Z' }),
    ])?.id).toBe('timed')
  })

  it('offers nothing when no video is in progress', () => {
    expect(pickContinueVideo([video({}), video({ passedSegments: 10 })])).toBeNull()
  })
})

describe('helpers', () => {
  it('computes progress, duration and the player path', () => {
    expect(progressPercent(video({ passedSegments: 7, totalSegments: 24 }))).toBe(29)
    expect(progressPercent(video({ totalSegments: 0 }))).toBe(0)
    expect(formatDuration(192)).toBe('3:12')
    expect(formatDuration(19)).toBe('0:19')
    expect(formatDuration(null)).toBeNull()
    expect(playerPath('abc')).toBe('/video-dictation/abc')
  })
})
