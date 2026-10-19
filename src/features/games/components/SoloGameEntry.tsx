import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { gameApi } from '../api/gameApi'
import { startSoloRoom } from '../lib/startSoloRoom'

type SoloGameEntryProps = {
  roomId: string
}

export function SoloGameEntry({ roomId }: SoloGameEntryProps) {
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function start() {
      try {
        const room = await gameApi.room(roomId, controller.signal)
        if (controller.signal.aborted) return
        const match = await startSoloRoom(room, controller.signal)
        if (!controller.signal.aborted) {
          navigate(`/games/matches/${match.matchId}/play`, { replace: true })
        }
      } catch {
        if (!controller.signal.aborted) setFailed(true)
      }
    }
    void start()
    return () => {
      controller.abort()
    }
  }, [roomId, navigate, retry])

  return (
    <main className="game-room-page">
      <section
        className="game-panel game-state"
        role={failed ? 'alert' : 'status'}
      >
        <p>
          {failed
            ? 'Chưa thể bắt đầu lượt chơi. Vui lòng thử lại.'
            : 'Đang bắt đầu lượt chơi…'}
        </p>
        {failed && (
          <>
            <Button
              onClick={() => {
                setFailed(false)
                setRetry((value) => value + 1)
              }}
            >
              Thử lại
            </Button>
            <Button asChild variant="outline">
              <Link to="/games/wordly/setup?mode=SOLO">
                Về cấu hình chơi đơn
              </Link>
            </Button>
          </>
        )}
      </section>
    </main>
  )
}
