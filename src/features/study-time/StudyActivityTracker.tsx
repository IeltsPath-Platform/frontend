import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthSession } from '@/features/auth/authSession'
import { API_BASE_URL, USE_MOCK_LEARNING } from '@/lib/env'
import { apiRequest, getAccessToken, HttpError } from '@/lib/httpClient'
import { ActiveIntervals, SESSION_IN_USE_RETRY_DELAYS_MS, type ActiveInterval } from './activeIntervals'

type SourceType = 'LESSON' | 'PRACTICE' | 'REVIEW' | 'ASSESSMENT' | 'VOCABULARY_REVIEW'
interface Session { sessionId: string; epoch: number; serverStartedAt: string; serverNow: string; nextSequence: number }
interface Payload { epoch: number; sequence: number; intervals: ActiveInterval[] }
type State = { message: string; retry: boolean; conflict: boolean }
const STARTING: State = { message: 'Đang kết nối bộ ghi thời gian học…', retry: false, conflict: false }

/** Telemetry failure never blocks answering. Every retry retains its original sequence and payload. */
export function StudyActivityTracker({ sourceType, sourceId, enabled = true }: { sourceType: SourceType; sourceId: string; enabled?: boolean }) {
  const { isLoggedIn, email } = useAuthSession()
  const [state, setState] = useState<State>(STARTING)
  const [attempt, setAttempt] = useState({ version: 0, takeover: false })
  const active = enabled && isLoggedIn && (sourceType === 'VOCABULARY_REVIEW' || !USE_MOCK_LEARNING)
  useEffect(() => {
    if (!active) return
    let disposed = false
    let ending = false
    let blocked = false
    let closing = false
    let takeover = attempt.takeover
    let session: Session | null = null
    let collector: ActiveIntervals | null = null
    let anchor = 0
    let baseOffset = 0
    let token: string | null = null
    let sequence = 1
    let pending: Payload | null = null
    let clientSessionId = crypto.randomUUID()
    let inFlight: Promise<boolean> | null = null
    let lifecycle: Promise<void> = Promise.resolve()
    let lastSuccess = performance.now()
    const mediaPositions = new WeakMap<HTMLMediaElement, number>()
    const recording = new Set<string>()
    const offset = () => Math.max(0, Math.floor(baseOffset + performance.now() - anchor))
    const report = (next: State) => { if (!disposed && !ending) setState(next) }
    const errorCode = (reason: unknown) => reason instanceof HttpError ? reason.code ?? reason.message : ''
    const sessionIsInvalid = (reason: unknown) => ['LEASE_EXPIRED', 'SESSION_CLOSED'].includes(errorCode(reason))
    const sessionIsInUse = (reason: unknown) => errorCode(reason) === 'SESSION_IN_USE'
    const fail = (reason: unknown) => {
      blocked = true
      const conflict = sessionIsInUse(reason)
      report({ message: conflict ? 'Thời gian đang được ghi ở một phiên khác.' : 'Chưa ghi được thời gian học. Bạn vẫn có thể tiếp tục làm bài.', retry: true, conflict })
    }
    function sample() {
      let playing = false
      document.querySelectorAll<HTMLMediaElement>('audio,video').forEach((media) => {
        const previous = mediaPositions.get(media)
        if (!media.paused && !media.ended && media.readyState >= 3 && previous !== undefined && media.currentTime > previous) playing = true
        mediaPositions.set(media, media.currentTime)
      })
      collector?.sample(offset(), document.visibilityState === 'visible' && !ending, playing || recording.size > 0)
    }
    async function send(captured: Session, payload: Payload, close: boolean, keepalive = false) {
      const path = `/api/users/me/study-sessions/${captured.sessionId}/${close ? 'close' : 'heartbeats'}`
      if (keepalive) {
        if (!token) throw new Error('No session token')
        const response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
        if (!response.ok) throw new Error('Study close was not acknowledged')
      } else {
        await apiRequest(path, { method: 'POST', body: payload, auth: true, timeoutMs: 10_000 })
        token = getAccessToken()
      }
    }
    function flush(): Promise<boolean> {
      if (inFlight) return inFlight
      if (!session || blocked || closing) return Promise.resolve(false)
      sample()
      const captured = session
      pending ??= { epoch: captured.epoch, sequence, intervals: collector?.take() ?? [] }
      const payload = pending
      inFlight = send(captured, payload, false).then(() => {
        sequence++
        pending = null
        lastSuccess = performance.now()
        report({ message: 'Đang ghi thời gian học khi bạn hoạt động trên tab này.', retry: false, conflict: false })
        return true
      }).catch((reason: unknown) => {
        if (sessionIsInvalid(reason)) {
          session = null
          collector = null
          pending = null
          clientSessionId = crypto.randomUUID()
          takeover = false
          blocked = false
          report(STARTING)
          if (!closing) window.setTimeout(() => { lifecycle = lifecycle.then(start) }, 0)
        } else if (reason instanceof HttpError && reason.status !== 0 || performance.now() - lastSuccess >= 70_000) fail(reason)
        else report({ message: 'Mất kết nối bộ ghi thời gian; đang thử lại trong giới hạn phiên.', retry: false, conflict: false })
        return false
      }).finally(() => { inFlight = null })
      return inFlight
    }
    async function close() {
      const captured = session
      if (!captured) return
      closing = true
      sample()
      const remaining = collector?.take() ?? []
      collector = null
      // A failed heartbeat must be replayed at the heartbeat endpoint, never as a different close payload.
      if (inFlight) await inFlight
      try {
        if (pending) { await send(captured, pending, false, true); pending = null; sequence++ }
        await send(captured, { epoch: captured.epoch, sequence, intervals: remaining }, true, true)
        window.dispatchEvent(new Event('study-statistics-changed'))
      } catch { /* Best effort on page exit; server lease caps any lost tail. */ }
      session = null
      closing = false
    }
    async function start() {
      if (disposed || ending || blocked || document.visibilityState !== 'visible' || session) return
      report(STARTING)
      for (let retry = 0; retry <= SESSION_IN_USE_RETRY_DELAYS_MS.length; retry++) {
        try {
          const created = await apiRequest<Session>('/api/users/me/study-sessions', { method: 'POST', auth: true, timeoutMs: 10_000, body: { clientSessionId, sourceType, sourceId, takeover } })
          session = created
          token = getAccessToken()
          sequence = created.nextSequence
          baseOffset = Math.max(0, Date.parse(created.serverNow) - Date.parse(created.serverStartedAt))
          anchor = performance.now()
          lastSuccess = anchor
          collector = new ActiveIntervals(Math.floor(baseOffset))
          if (disposed || ending || document.visibilityState !== 'visible') { await close(); return }
          report({ message: 'Đang ghi thời gian học khi bạn hoạt động trên tab này.', retry: false, conflict: false })
          return
        } catch (reason) {
          if (!sessionIsInUse(reason) || retry === SESSION_IN_USE_RETRY_DELAYS_MS.length) { fail(reason); return }
          await new Promise((resolve) => window.setTimeout(resolve, SESSION_IN_USE_RETRY_DELAYS_MS[retry]))
          if (disposed || ending || document.visibilityState !== 'visible') return
        }
      }
    }
    const input = () => { collector?.activity(offset()) }
    const visibility = () => {
      lifecycle = lifecycle.then(async () => {
        if (document.visibilityState === 'hidden') await close()
        else if (!disposed && !ending) {
          await close()
          clientSessionId = crypto.randomUUID()
          takeover = false
          blocked = false
          pending = null
          collector = null
          await start()
        }
      })
    }
    const finish = () => { ending = true; lifecycle = lifecycle.then(close) }
    const mediaRecording = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; active: boolean }>).detail
      if (!detail) return
      if (detail.active) recording.add(detail.id); else recording.delete(detail.id)
    }
    const startTimer = window.setTimeout(() => { lifecycle = lifecycle.then(start) }, 0)
    const sampleTimer = window.setInterval(sample, 1000)
    const heartbeatTimer = window.setInterval(() => { if (!disposed && !ending && document.visibilityState === 'visible') void flush() }, 30_000)
    for (const event of ['pointerdown', 'keydown', 'input', 'scroll']) window.addEventListener(event, input, { passive: true, capture: true })
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', finish)
    window.addEventListener('study-session-ending', finish)
    window.addEventListener('study-recording', mediaRecording)
    return () => {
      disposed = true
      window.clearTimeout(startTimer)
      window.clearInterval(sampleTimer)
      window.clearInterval(heartbeatTimer)
      for (const event of ['pointerdown', 'keydown', 'input', 'scroll']) window.removeEventListener(event, input, { capture: true })
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', finish)
      window.removeEventListener('study-session-ending', finish)
      window.removeEventListener('study-recording', mediaRecording)
      lifecycle = lifecycle.then(close)
    }
  }, [active, email, sourceType, sourceId, attempt])
  if (!active) return null
  return <div className="lp-hint" role="status"><span>{state.message}</span>{state.retry && <Button variant="outline" size="sm" onClick={() => setAttempt((value) => ({ version: value.version + 1, takeover: state.conflict }))}>{state.conflict ? 'Ghi thời gian tại đây' : 'Thử lại bộ ghi'}</Button>}</div>
}
