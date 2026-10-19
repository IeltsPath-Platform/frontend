import { useEffect, useEffectEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Flame, Heart, Lightbulb, LogOut, Timer, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAuthSession } from '@/features/auth/authSession'
import { useWordlyMatch } from '../hooks/useWordlyMatch'
import { useWordClock } from '../hooks/useWordClock'
import { WordlyBoard } from '../components/WordlyBoard'
import { WordlyKeyboard } from '../components/WordlyKeyboard'
import { GameRanking } from '../components/GameRanking'
import { playerStatusLabel } from '../lib/playerStatusLabel'

export function WordlyPlayPage() {
  const { matchId = '' } = useParams()
  const { email } = useAuthSession()
  return <WordlyPlayContent key={`${email}:${matchId}`} matchId={matchId} />
}
type WordlyPlayContentProps = {
  matchId: string
}

function WordlyPlayContent({ matchId }: WordlyPlayContentProps) {
  const game = useWordlyMatch(matchId)
  const [draftState, setDraft] = useState({ wordId: '', value: '' })
  const [pressed, setPressed] = useState<{ key: string; id: number } | null>(
    null,
  )
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!game.toast) return
    const show = window.setTimeout(
      () => setToast(game.toast?.message ?? null),
      0,
    )
    const hide = window.setTimeout(() => setToast(null), 3000)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [game.toast])
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const word = game.word
  const seconds = useWordClock(word?.deadlineAt ?? null)
  const draftKey = word ? `${word.playerWordId}:${word.attemptsUsed}` : ''
  const draft = draftState.wordId === draftKey ? draftState.value : ''
  const blocked = game.busy || Boolean(game.pending)
  const multiplayer = game.match?.playerMode === 'MULTIPLAYER'
  const spectator =
    multiplayer &&
    game.ownPlayer &&
    !['ACTIVE', 'DISCONNECTED'].includes(game.ownPlayer.status)
  function press(key: string) {
    if (!word || blocked || leaveOpen || hintOpen) return
    setPressed((previous) => ({
      key: key.toUpperCase(),
      id: (previous?.id ?? 0) + 1,
    }))
    if (key === 'Enter') {
      if (draft.length === word.columns) void game.submit(draft)
      return
    }
    if (key === 'Backspace')
      setDraft({ wordId: draftKey, value: draft.slice(0, -1) })
    else if (/^[A-Z]$/i.test(key) && draft.length < word.columns)
      setDraft({ wordId: draftKey, value: draft + key.toUpperCase() })
  }
  const keyDown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target
    if (
      target instanceof HTMLElement &&
      (target.closest(
        'input,textarea,select,[contenteditable=true],[role=dialog]',
      ) ||
        (target.closest('button,a') && ['Enter', ' '].includes(event.key)))
    )
      return
    if (
      /^[a-z]$/i.test(event.key) ||
      ['Enter', 'Backspace'].includes(event.key)
    ) {
      event.preventDefault()
      press(event.key)
    }
  })
  useEffect(() => {
    const listener = (event: KeyboardEvent) => keyDown(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])
  return (
    <main className="games-page wordly-page">
      <header className="games-heading">
        <div>
          <p className="games-eyebrow">
            TRÒ CHƠI / WORDLY {multiplayer && '· NHIỀU NGƯỜI'}
          </p>
          <h1>{spectator ? 'Theo dõi trận đấu' : 'Đoán từ theo nghĩa'}</h1>
        </div>
        {game.ownPlayer?.status === 'FORFEITED' ? (
          <Button asChild variant="outline">
            <Link to="/games">Về trò chơi</Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={game.busy}
            onClick={() => setLeaveOpen(true)}
          >
            <LogOut aria-hidden="true" />
            Thoát trò chơi
          </Button>
        )}
      </header>
      {multiplayer && (
        <p className="games-muted" role="status">
          {game.connected
            ? 'Đang kết nối trực tiếp'
            : 'Đang nối lại kết nối · Vẫn đồng bộ định kỳ. Thời gian trận tiếp tục chạy.'}
        </p>
      )}
      {game.loading && <p role="status">Đang tải lượt chơi…</p>}
      {game.error && (
        <div className="games-alert" role="alert">
          <p>{game.error}</p>
          <Button
            variant="outline"
            disabled={game.busy}
            onClick={() =>
              game.pending
                ? void game.submit(game.pending.guess)
                : void game.refresh()
            }
          >
            {game.pending ? 'Thử lại lượt đoán' : 'Đồng bộ lại'}
          </Button>
        </div>
      )}
      {game.pending && !game.busy && (
        <div className="games-notice" role="status">
          <p>Lượt đoán đang chờ xác nhận. Thử lại sẽ gửi đúng request cũ.</p>
          <Button
            disabled={game.busy}
            onClick={() => void game.submit(game.pending?.guess ?? '')}
          >
            Thử lại lượt đoán đang chờ
          </Button>
        </div>
      )}
      {game.notice && (
        <p className="games-notice" role="status">
          {game.notice}
        </p>
      )}
      <div
        className={`wordly-match-layout${multiplayer && game.ranking ? ' wordly-match-layout-multiplayer' : ''}`}
      >
        <div className="wordly-play-column">
          {spectator && (
            <section className="wordly-arena" role="status">
              <h2>{playerStatusLabel[game.ownPlayer!.status]}</h2>
              <p>
                Bạn đã đạt <strong>{game.ownPlayer!.totalScore} điểm</strong>.
                Trận đấu vẫn tiếp tục; xếp hạng sẽ được chốt khi cả trận kết
                thúc.
              </p>
              <p>Bạn có thể ở lại theo dõi bảng xếp hạng.</p>
            </section>
          )}
          {!game.loading && !word && !spectator && (
            <Link to="/games">Về danh sách trò chơi</Link>
          )}
          {word && (
            <>
              <section className="wordly-hud" aria-label="Trạng thái lượt chơi">
                <span>
                  <Heart aria-hidden="true" /> Mạng{' '}
                  <strong>
                    {word.player.livesRemaining}/
                    {game.room?.settings?.initialLives ?? '–'}
                  </strong>
                </span>
                <span>
                  <Timer aria-hidden="true" />
                  {seconds === null
                    ? 'Không giới hạn thời gian'
                    : seconds === 0
                      ? 'Đang đồng bộ hết giờ…'
                      : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`}
                </span>
                <span>
                  <Trophy aria-hidden="true" /> Điểm{' '}
                  <strong>{word.player.totalScore}</strong>
                </span>
                <span>
                  <Flame aria-hidden="true" /> Chuỗi{' '}
                  <strong>{word.player.currentStreak}</strong>
                </span>
                <span>
                  Từ{' '}
                  <strong>
                    {word.wordNumber}/{word.wordLimit ?? '∞'}
                  </strong>
                </span>
              </section>
              <section className="wordly-arena" aria-label="Bảng đoán từ">
                <p className="games-eyebrow">ĐOÁN TỪ MANG NGHĨA</p>
                <h2>{word.meaning}</h2>
                <p className="games-muted">
                  {word.columns} chữ · {word.maxAttempts} lượt đoán. Hết hàng
                  hoặc hết giờ mới mất 1 mạng.
                </p>
                <div className="wordly-board-stage">
                  <WordlyBoard
                    word={word}
                    draft={draft}
                    revealing={game.revealing}
                  />
                  {toast && (
                    <div className="wordly-toast" role="alert">
                      {toast}
                    </div>
                  )}
                </div>
                <div className="wordly-legend">
                  <span className="CORRECT">Đúng vị trí</span>
                  <span className="PRESENT">Sai vị trí</span>
                  <span className="ABSENT">Không có</span>
                </div>
                {game.feedback &&
                  game.feedback.playerWordId !== word.playerWordId && (
                    <p className="games-muted" role="status">
                      Từ trước:{' '}
                      {game.feedback.wordStatus === 'SOLVED'
                        ? `${game.feedback.guess} · +${game.feedback.points.total} điểm`
                        : 'Chưa giải được'}
                    </p>
                  )}
                <WordlyKeyboard
                  pressed={pressed}
                  keyboard={word.keyboard}
                  disabled={blocked}
                  press={press}
                />
                <div className="games-actions">
                  <Button
                    disabled={blocked || draft.length !== word.columns}
                    onClick={() => void game.submit(draft)}
                  >
                    Gửi từ đoán
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      game.busy ||
                      Boolean(game.pending) ||
                      word.guesses.length === 0
                    }
                    onClick={() => setHintOpen(true)}
                  >
                    <Lightbulb />
                    {game.hint ? 'Xem gợi ý đã dùng' : 'Gợi ý · 1 lần/từ'}
                  </Button>
                </div>
                <p className="games-muted">
                  {word.timeEnabled
                    ? 'Điểm bằng số giây còn lại'
                    : 'Mỗi từ đúng: 100 điểm'}{' '}
                  · Từ đúng thứ 3 liên tiếp trở đi: +50 điểm/từ.
                </p>
              </section>
            </>
          )}
        </div>
        {multiplayer && game.ranking && (
          <aside
            className="wordly-ranking-sidebar"
            aria-label="Xếp hạng trận đấu"
          >
            <GameRanking
              ranking={game.ranking}
              ownUserId={game.ownPlayer?.userId}
            />
          </aside>
        )}
      </div>
      <Dialog open={hintOpen} onOpenChange={setHintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gợi ý cho từ hiện tại</DialogTitle>
            <DialogDescription>
              Mỗi từ chỉ được dùng một lần. Gợi ý không trừ điểm, mạng hoặc lượt
              đoán.
            </DialogDescription>
          </DialogHeader>
          {game.hint ? (
            <>
              <p>
                Hàng gần nhất: <strong>{game.hint.sourceGuess}</strong>
              </p>
              <div
                className="wordly-hint-row"
                aria-label="Hàng đoán sau khi lật gợi ý"
              >
                {[...game.hint.sourceGuess].map((letter, col) => (
                  <span
                    key={col}
                    className={`wordly-cell ${col === game.hint?.revealedCell.column ? 'CORRECT' : (game.hint?.sourceLetters[col] ?? '')}`}
                  >
                    {col === game.hint?.revealedCell.column
                      ? game.hint.revealedCell.letter
                      : letter}
                  </span>
                ))}
              </div>
              <p className="games-notice">
                Chữ <strong>{game.hint.revealedCell.letter}</strong> ở ô thứ{' '}
                <strong>{game.hint.revealedCell.column + 1}</strong> là đúng vị
                trí.
              </p>
              <p>Đã dùng 1/1 gợi ý cho từ này.</p>
            </>
          ) : (
            <>
              <p>
                Lật vị trí trái nhất chưa được đoán đúng, xét toàn bộ lịch sử
                hợp lệ.
              </p>
              <Button
                disabled={game.busy}
                onClick={() => void game.revealHint()}
              >
                {game.busy ? 'Đang lấy gợi ý…' : 'Lật một chữ'}
              </Button>
            </>
          )}
          {game.error && <p role="alert">{game.error}</p>}
        </DialogContent>
      </Dialog>
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="gap-6 p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle>Thoát trò chơi?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {multiplayer
                ? 'Bạn giữ điểm và vẫn có tên trong bảng xếp hạng với trạng thái đã rời trận. Những người còn lại tiếp tục chơi theo điều kiện kết thúc trận.'
                : 'Trò chơi sẽ kết thúc. Bạn giữ nguyên số điểm đã đạt.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="min-h-12 w-full rounded-xl px-5 text-base sm:w-auto"
              disabled={game.busy}
              onClick={() => setLeaveOpen(false)}
            >
              Tiếp tục chơi
            </Button>
            <Button
              className="min-h-12 w-full rounded-xl px-5 text-base font-semibold sm:w-auto"
              disabled={game.busy}
              onClick={async () => {
                await game.leave()
                setLeaveOpen(false)
              }}
            >
              {game.busy ? 'Đang thoát…' : 'Thoát trò chơi'}
            </Button>
          </div>
          {game.error && <p role="alert">{game.error}</p>}
        </DialogContent>
      </Dialog>
    </main>
  )
}
