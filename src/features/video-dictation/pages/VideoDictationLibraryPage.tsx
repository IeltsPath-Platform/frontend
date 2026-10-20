import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Loader2, Play, Search, SearchX, Video } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { Button } from '@/components/ui/button'
import { HttpError } from '@/lib/httpClient'
import { VideoRow } from '../components/VideoRow'
import { VIDEO_LEVELS, videoDictationApi, type DictationVideoListItem, type VideoLevel } from '../api/videoDictationApi'
import {
  FOCUS_COUNT,
  LEVEL_LABEL,
  MORE_STEP,
  ROW_COUNT,
  filterVideos,
  formatDuration,
  groupByLevel,
  pickContinueVideo,
  playerPath,
  progressPercent,
} from '../lib/videoDictationLibrary'
import '../video-dictation.css'

type LevelFilter = VideoLevel | 'ALL'

function errorMessage(error: unknown) {
  return error instanceof HttpError ? error.message : 'Không tải được thư viện video. Vui lòng thử lại.'
}

function Thumbnail({ video }: { video: DictationVideoListItem }) {
  const duration = formatDuration(video.durationSeconds)
  return (
    <div className="vd-card__thumb">
      {video.thumbnailUrl
        ? <img src={video.thumbnailUrl} alt="" loading="lazy" />
        : <span className="vd-card__thumb-empty" aria-hidden="true"><Video size={28} /></span>}
      {duration ? <span className="vd-card__duration">{duration}</span> : null}
    </div>
  )
}

function ProgressBar({ video }: { video: DictationVideoListItem }) {
  const percent = progressPercent(video)
  return (
    <div className="vd-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
      aria-label={`Đã qua ${video.passedSegments} trên ${video.totalSegments} câu`}>
      <span style={{ width: `${percent}%` }} />
    </div>
  )
}

function VideoCard({ video }: { video: DictationVideoListItem }) {
  const started = video.passedSegments > 0
  return (
    <li className="vd-card">
      <Link className="vd-card__link" to={playerPath(video.id)}
        aria-label={`${video.title}, ${video.totalSegments} câu${started ? `, đã qua ${video.passedSegments}` : ''}`}>
        <Thumbnail video={video} />
        <div className="vd-card__body">
          <h3 className="vd-card__title">{video.title}</h3>
          <p className="vd-card__meta">{video.totalSegments} câu{video.level ? ` · ${video.level}` : ''}</p>
          {started
            ? <div className="vd-card__progress"><ProgressBar video={video} /><span>{video.passedSegments}/{video.totalSegments}</span></div>
            : <p className="vd-card__fresh">Chưa làm</p>}
        </div>
      </Link>
    </li>
  )
}

function ContinueCard({ video }: { video: DictationVideoListItem }) {
  return (
    <section className="vd-continue" aria-labelledby="vd-continue-title">
      <Thumbnail video={video} />
      <div className="vd-continue__body">
        <span className="vd-pill">Tiếp tục xem</span>
        <h2 id="vd-continue-title" className="vd-continue__title">{video.title}</h2>
        <p className="vd-continue__meta">
          {video.level ? `${video.level} · ` : ''}Câu {video.passedSegments + 1} / {video.totalSegments}
        </p>
        <ProgressBar video={video} />
      </div>
      <Link className="vd-continue__cta" to={playerPath(video.id)}><Play aria-hidden="true" size={16} />Tiếp tục</Link>
    </section>
  )
}

export function VideoDictationLibraryPage() {
  const [videos, setVideos] = useState<DictationVideoListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState<LevelFilter>('ALL')
  const [search, setSearch] = useState('')
  // How many more videos of each level the learner asked for, valid for the filter they were asked under.
  const [more, setMore] = useState<{ key: string; extra: Partial<Record<VideoLevel, number>> }>({ key: '', extra: {} })

  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    videoDictationApi.list(controller.signal)
      .then((items) => { if (!controller.signal.aborted) setVideos(items) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(errorMessage(reason)) })
    return () => controller.abort()
  }, [attempt])

  const retry = () => {
    setError(null)
    setVideos(null)
    setAttempt((value) => value + 1)
  }

  const continueVideo = useMemo(() => (videos ? pickContinueVideo(videos) : null), [videos])
  const visible = useMemo(() => (videos ? filterVideos(videos, level, search) : []), [videos, level, search])
  const groups = useMemo(() => groupByLevel(visible), [visible])
  const filterKey = `${level}|${search}`
  const extra = more.key === filterKey ? more.extra : {}
  const narrowed = level !== 'ALL' || search.trim() !== ''

  return (
    <div className="vd-page">
      <SiteNavbar />
      <main className="vd-main">
        <header className="vd-header">
          <p className="vd-eyebrow">Nghe chép video</p>
          <h1>Nghe từng câu, gõ lại thật chính xác</h1>
          <p className="vd-lead">Video tự dừng sau mỗi câu để bạn gõ lại. Chọn video theo trình độ của bạn.</p>
        </header>

        {error ? (
          <div className="vd-state" role="alert">
            <AlertTriangle aria-hidden="true" size={28} />
            <p>{error}</p>
            <Button type="button" onClick={retry}>Thử lại</Button>
          </div>
        ) : videos === null ? (
          <div className="vd-state" role="status" aria-live="polite">
            <Loader2 aria-hidden="true" className="vd-spin" size={28} />
            <p>Đang tải thư viện video…</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="vd-state" role="status">
            <Video aria-hidden="true" size={28} />
            <p>Chưa có video nghe chép nào. Bạn quay lại sau nhé.</p>
          </div>
        ) : (
          <>
            {continueVideo ? <ContinueCard video={continueVideo} /> : null}

            <div className="vd-toolbar">
              <div className="vd-levels" role="group" aria-label="Lọc theo trình độ">
                {(['ALL', ...VIDEO_LEVELS] as const).map((value) => (
                  <button key={value} type="button" className="vd-chip" aria-pressed={level === value} onClick={() => setLevel(value)}>
                    {value === 'ALL' ? 'Tất cả' : value}
                  </button>
                ))}
              </div>
              <form className="vd-search" role="search" onSubmit={(event) => event.preventDefault()}>
                <label className="sr-only" htmlFor="vd-search-input">Tìm tên video</label>
                <Search aria-hidden="true" size={16} />
                <input id="vd-search-input" type="search" value={search} maxLength={80} placeholder="Tìm tên video"
                  onChange={(event) => setSearch(event.target.value)} />
              </form>
            </div>

            {groups.length === 0 ? (
              <div className="vd-state" role="status">
                <SearchX aria-hidden="true" size={28} />
                <p>Không có video nào khớp bộ lọc hiện tại.</p>
                <Button type="button" variant="outline" onClick={() => { setLevel('ALL'); setSearch('') }}>Xóa bộ lọc</Button>
              </div>
            ) : groups.map((group) => {
              const shown = FOCUS_COUNT + (extra[group.level] ?? 0)
              const left = group.videos.length - shown
              return (
                <section key={group.level} className="vd-group" aria-labelledby={`vd-group-${group.level}`}>
                  <h2 id={`vd-group-${group.level}`} className="vd-group__title">
                    <span className="vd-group__level">{group.level}</span> {LEVEL_LABEL[group.level]}
                    <span className="vd-group__count"> · {group.videos.length} video</span>
                  </h2>
                  {narrowed ? (
                    <>
                      <ul className="vd-grid">
                        {group.videos.slice(0, shown).map((video) => <VideoCard key={video.id} video={video} />)}
                      </ul>
                      {left > 0 ? (
                        <Button type="button" variant="outline" className="vd-more"
                          onClick={() => setMore({ key: filterKey, extra: { ...extra, [group.level]: (extra[group.level] ?? 0) + MORE_STEP } })}>
                          Xem thêm {Math.min(left, MORE_STEP)} video <span className="vd-more__left">(còn {left})</span>
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <VideoRow label={group.level}>
                      {group.videos.slice(0, ROW_COUNT).map((video) => <VideoCard key={video.id} video={video} />)}
                      {group.videos.length > ROW_COUNT ? (
                        <li className="vd-card vd-card--all">
                          <button type="button" className="vd-card__all" onClick={() => setLevel(group.level)}>
                            Xem tất cả {group.videos.length} video {group.level}
                          </button>
                        </li>
                      ) : null}
                    </VideoRow>
                  )}
                </section>
              )
            })}
          </>
        )}
      </main>
    </div>
  )
}
