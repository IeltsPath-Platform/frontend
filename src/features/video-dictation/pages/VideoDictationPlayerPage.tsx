import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { Button } from '@/components/ui/button'
import { HttpError } from '@/lib/httpClient'
import {
  videoDictationApi,
  type DictationProgress,
  type DictationVideoDetail,
} from '../api/videoDictationApi'
import { ColumnResizer } from '../components/ColumnResizer'
import { CompletionSummary } from '../components/CompletionSummary'
import { DictationCard } from '../components/DictationCard'
import { LayoutSwitcher } from '../components/LayoutSwitcher'
import { PlayerStage } from '../components/PlayerStage'
import { ProgressPanel } from '../components/ProgressPanel'
import { SentenceNav } from '../components/SentenceNav'
import { SentencePanel } from '../components/SentencePanel'
import { useDictationSession } from '../hooks/useDictationSession'
import { useYouTubeSegmentPlayer } from '../hooks/useYouTubeSegmentPlayer'
import { useWideScreen } from '../hooks/useWideScreen'
import { readStoredColumn, readStoredLayout, storeColumn, storeLayout, type ColumnWidths, type ResizableLayout } from '../lib/playerLayout'
import '../video-dictation.css'
import '../video-dictation-player.css'

interface Loaded {
  detail: DictationVideoDetail
  progress: DictationProgress
}

function loadError(error: unknown) {
  if (error instanceof HttpError && error.status === 404) return 'Không tìm thấy video này hoặc video chưa được đăng.'
  return error instanceof HttpError ? error.message : 'Không tải được video. Vui lòng thử lại.'
}

/** `fit` pins the page to the window height so the exercise never needs scrolling. */
function PageFrame({ children, fit = false }: { children: React.ReactNode; fit?: boolean }) {
  return (
    <div className={fit ? 'vd-page vdp-page--fit' : 'vd-page'}>
      <SiteNavbar />
      {children}
    </div>
  )
}

/** Loads the video, its sentences and the learner's progress, then hands them to the dictation session. */
export function VideoDictationPlayerPage() {
  const { videoId = '' } = useParams<{ videoId: string }>()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([videoDictationApi.detail(videoId, controller.signal), videoDictationApi.progress(videoId, controller.signal)])
      .then(([detail, progress]) => { if (!controller.signal.aborted) setLoaded({ detail, progress }) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(loadError(reason)) })
    return () => controller.abort()
  }, [videoId, attempt])

  if (error) {
    return (
      <PageFrame>
        <main className="vd-main">
          <Link className="vdp-back" to="/video-dictation"><ArrowLeft aria-hidden="true" size={16} />Thoát</Link>
          <div className="vd-state" role="alert">
            <AlertTriangle aria-hidden="true" size={28} />
            <p>{error}</p>
            <Button type="button" onClick={() => { setError(null); setAttempt((value) => value + 1) }}>Thử lại</Button>
          </div>
        </main>
      </PageFrame>
    )
  }
  if (!loaded) {
    return (
      <PageFrame>
        <main className="vd-main">
          <div className="vd-state" role="status" aria-live="polite">
            <Loader2 aria-hidden="true" className="vd-spin" size={28} />
            <p>Đang tải video…</p>
          </div>
        </main>
      </PageFrame>
    )
  }
  return <PlayerContent key={loaded.detail.id} detail={loaded.detail} progress={loaded.progress} />
}

function PlayerContent({ detail, progress }: Loaded) {
  const containerRef = useRef<HTMLDivElement>(null)
  const player = useYouTubeSegmentPlayer(containerRef, detail.youtubeVideoId)
  const session = useDictationSession(detail, progress, player)
  const [rate, setRate] = useState(1)
  const [layout, setLayout] = useState(readStoredLayout)
  const mainRef = useRef<HTMLElement>(null)
  const [columns, setColumns] = useState<ColumnWidths>(() => ({ compact: readStoredColumn('compact'), theater: readStoredColumn('theater') }))
  const done = session.phase === 'done'
  const wide = useWideScreen()
  // Compact and theater have two columns whose divider can be dragged; the width is kept for each layout.
  const resizable: ResizableLayout | null = wide && (layout === 'compact' || layout === 'theater') ? layout : null
  const columnWidth = resizable ? columns[resizable] : null
  const resizeColumn = (width: number | null) => {
    if (!resizable) return
    setColumns((current) => ({ ...current, [resizable]: width }))
    storeColumn(resizable, width)
  }
  // Where the progress goes: the list of sentences (a column beside the exercise in compact and theater, a row along the
  // bottom in stacked), or, on a narrow window where the page is one column whatever was picked, a slim strip under it.
  const progressProps = { segments: session.segments, stats: session.stats, current: session.index, passed: session.passedCount, onGoTo: session.goTo }

  if (session.segments.length === 0) {
    return (
      <PageFrame>
        <main className="vd-main">
          <Link className="vdp-back" to="/video-dictation"><ArrowLeft aria-hidden="true" size={16} />Thoát</Link>
          <div className="vd-state" role="status"><p>Video này chưa có câu nào để nghe chép.</p></div>
        </main>
      </PageFrame>
    )
  }

  return (
    <PageFrame fit={!done}>
      <header className="vdp-bar">
        <Link className="vdp-back" to="/video-dictation"><ArrowLeft aria-hidden="true" size={16} />Thoát</Link>
        <h1 className="vdp-bar__title" title={detail.title}>{detail.title}{detail.level ? ` · ${detail.level}` : ''}</h1>
        {done ? null : <LayoutSwitcher value={layout} onChange={(next) => { setLayout(next); storeLayout(next) }} />}
        <span className="vdp-bar__count">
          {done ? 'Đã hoàn thành' : `Câu ${session.index + 1} / ${session.segments.length}`} · ✓ {session.passedCount} đã qua
        </span>
      </header>

      <main ref={mainRef} className={done ? 'vdp-main' : 'vdp-main vdp-main--fit'} data-layout={done ? undefined : layout}
        style={columnWidth === null ? undefined : ({ '--vdp-column': `${columnWidth}px` } as CSSProperties)}>
        {done ? (
          <CompletionSummary title={detail.title} segments={session.segments} stats={session.stats}
            onRedoSegment={session.redo} onRestart={session.restart} />
        ) : (
          <>
            <div className="vdp-layout">
              <PlayerStage
                containerRef={containerRef}
                status={player.status}
                playerError={player.error}
                youtubeUrl={detail.youtubeUrl}
                phase={session.phase}
                playing={session.playing}
                stalled={player.stalled}
                sequenceNo={session.segment.sequenceNo}
                rate={rate}
                onStart={session.start}
                onReplay={session.replay}
                onRate={(value) => { setRate(value); player.setRate(value) }}
              >
                {wide && layout === 'stacked' ? <SentenceNav index={session.index} total={session.segments.length} passed={session.passedCount} onGoTo={session.goTo} /> : null}
              </PlayerStage>
              <DictationCard
                phase={session.phase}
                finishes={session.finishes}
                segment={session.segment}
                text={session.text}
                tries={session.tries}
                match={session.match}
                revealed={session.revealed}
                meaningVisible={session.meaningVisible}
                busy={session.busy}
                notice={session.notice}
                onText={session.setText}
                onReplay={session.replay}
                onCheck={session.check}
                onRetry={session.retry}
                onNext={session.next}
                onSkip={session.skip}
                onToggleWord={session.toggleWord}
                onToggleAllWords={session.toggleAllWords}
                onToggleMeaning={session.toggleMeaning}
              />
            </div>
            {wide ? <SentencePanel {...progressProps} /> : <ProgressPanel {...progressProps} />}
            {resizable ? (
              <ColumnResizer edge={resizable === 'compact' ? 'left' : 'right'} containerRef={mainRef} onResize={resizeColumn}
                label={resizable === 'compact' ? 'Độ rộng cột video và danh sách câu' : 'Độ rộng danh sách câu'} />
            ) : null}
          </>
        )}
      </main>
    </PageFrame>
  )
}
