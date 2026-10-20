import { VIDEO_LEVELS, type DictationVideoListItem, type VideoLevel } from '../api/videoDictationApi'

export const LEVEL_LABEL: Record<VideoLevel, string> = {
  A1: 'Sơ cấp',
  A2: 'Cơ bản',
  B1: 'Trung cấp',
  B2: 'Khá',
  C1: 'Nâng cao',
  C2: 'Thành thạo',
}

export interface LevelGroup {
  level: VideoLevel
  label: string
  videos: DictationVideoListItem[]
}

/**
 * While browsing all levels each level is one swipeable row of its first `ROW_COUNT` videos, ending in a card that opens the
 * level whole. Once the learner has narrowed down by level or by a search the videos are a grid: `FOCUS_COUNT` of a level at
 * first, `MORE_STEP` more on each "Xem thêm". A library of hundreds of videos stays a page of a few screens this way.
 */
export const ROW_COUNT = 20
export const FOCUS_COUNT = 24
export const MORE_STEP = 24

/** Case- and accent-insensitive match of a search text against a video title. */
function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

/** Videos of the chosen level (or all) whose title contains the search text. */
export function filterVideos(videos: DictationVideoListItem[], level: VideoLevel | 'ALL', search: string) {
  const needle = normalize(search)
  return videos.filter((video) => (level === 'ALL' || video.level === level) && (!needle || normalize(video.title).includes(needle)))
}

/** Groups videos by level in A1 → C2 order; levels without a video are left out. */
export function groupByLevel(videos: DictationVideoListItem[]): LevelGroup[] {
  return VIDEO_LEVELS
    .map((level) => ({ level, label: LEVEL_LABEL[level], videos: videos.filter((video) => video.level === level) }))
    .filter((group) => group.videos.length > 0)
}

/**
 * The video to offer under "Tiếp tục xem": of the videos started but not finished, the one the learner practised
 * most recently. Without a practice time the order of the list decides, and such a video comes after any that has one.
 */
export function pickContinueVideo(videos: DictationVideoListItem[]) {
  const unfinished = videos.filter((video) => video.passedSegments > 0 && video.passedSegments < video.totalSegments)
  const time = (video: DictationVideoListItem) => (video.lastPracticedAt ? Date.parse(video.lastPracticedAt) : Number.NEGATIVE_INFINITY)
  return unfinished.reduce<DictationVideoListItem | null>(
    (latest, video) => (latest === null || time(video) > time(latest) ? video : latest), null)
}

export function progressPercent(video: Pick<DictationVideoListItem, 'passedSegments' | 'totalSegments'>) {
  return video.totalSegments > 0 ? Math.round((video.passedSegments / video.totalSegments) * 100) : 0
}

/** 192 → "3:12". */
export function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 0) return null
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

export function playerPath(videoId: string) {
  return `/video-dictation/${videoId}`
}
