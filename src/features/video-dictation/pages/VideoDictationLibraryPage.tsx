import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Captions, Headphones, Play, Search, SearchX, Video } from 'lucide-react'
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

/** Heights (in percent) of the bars of the waveform in the banner. */
const WAVE_BARS = [38, 62, 90, 54, 100, 70, 44, 84, 58, 96, 48, 76, 36, 88, 64, 42]
/** Skeleton cards while the library loads. */
const SKELETON_COUNT = 6

function errorMessage(error: unknown) {
  return error instanceof HttpError ? error.message : 'Không tải được thư viện video. Vui lòng thử lại.'
}

function Thumbnail({ video, decorated = false }: { video: DictationVideoListItem; decorated?: boolean }) {
  const duration = formatDuration(video.durationSeconds)
  // The picture fades in once it has loaded; until then the frame shimmers.
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={`vd-card__thumb${video.thumbnailUrl && !loaded ? ' is-loading' : ''}`}>
      {video.thumbnailUrl
        ? (
          <img
            ref={(image) => { if (image?.complete && image.naturalWidth > 0) setLoaded(true) }}
            className={loaded ? 'is-loaded' : undefined}
            src={video.thumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        )
        : <span className="vd-card__thumb-empty" aria-hidden="true"><Video size={28} /></span>}
      {decorated && video.level ? <span className="vd-card__level">{video.level}</span> : null}
      {decorated ? <span className="vd-card__play" aria-hidden="true"><Play size={20} fill="currentColor" /></span> : null}
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
    <li className="vd-card" data-level={video.level ?? undefined}>
      <Link className="vd-card__link" to={playerPath(video.id)}
        aria-label={`${video.title}, ${video.totalSegments} câu${started ? `, đã qua ${video.passedSegments}` : ''}`}>
        <Thumbnail video={video} decorated />
        <div className="vd-card__body">
          <h3 className="vd-card__title">{video.title}</h3>
          <p className="vd-card__meta"><Captions aria-hidden="true" size={14} />{video.totalSegments} câu{video.level ? ` · ${video.level}` : ''}</p>
          <div className="vd-card__foot">
            {started
              ? <div className="vd-card__progress"><ProgressBar video={video} /><span>{video.passedSegments}/{video.totalSegments}</span></div>
              : <p className="vd-card__fresh">Chưa làm</p>}
            <span className="vd-card__go" aria-hidden="true"><ArrowRight size={16} /></span>
          </div>
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
        <header className="vd-header vd-hero">
          <div className="vd-hero__text">
            <p className="vd-eyebrow">Nghe chép video</p>
            <h1>Nghe từng câu, gõ lại thật chính xác</h1>
            <p className="vd-lead">Video tự dừng sau mỗi câu để bạn gõ lại. Chọn video theo trình độ của bạn.</p>
          </div>
          <div className="vd-hero__art" aria-hidden="true">
            <Headphones size={44} />
            <span className="vd-wave">
              {WAVE_BARS.map((height, index) => <i key={index} style={{ '--h': `${height}%`, '--d': `${(index % 7) * 0.12}s` } as CSSProperties} />)}
            </span>
          </div>
        </header>

        {error ? (
          <div className="vd-state" role="alert">
            <AlertTriangle aria-hidden="true" size={28} />
            <p>{error}</p>
            <Button type="button" onClick={retry}>Thử lại</Button>
          </div>
        ) : videos === null ? (
          <div className="vd-loading" role="status" aria-live="polite">
            <span className="sr-only">Đang tải thư viện video…</span>
            <ul className="vd-grid" aria-hidden="true">
              {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <li className="vd-card vd-card--skeleton" key={index}>
                  <div className="vd-card__thumb is-loading" />
                  <div className="vd-card__body">
                    <i className="vd-skeleton-line" style={{ width: '86%' }} />
                    <i className="vd-skeleton-line" style={{ width: '58%' }} />
                    <i className="vd-skeleton-line" style={{ width: '30%', marginTop: '0.9rem' }} />
                  </div>
                </li>
              ))}
            </ul>
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
                <section key={group.level} className="vd-group" data-level={group.level} aria-labelledby={`vd-group-${group.level}`}>
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
