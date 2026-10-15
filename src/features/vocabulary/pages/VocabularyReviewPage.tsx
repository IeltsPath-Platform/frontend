import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthSession } from '@/features/auth/authSession'
import { StudyActivityTracker } from '@/features/study-time/StudyActivityTracker'
import { HttpError } from '@/lib/httpClient'
import { vocabularyReviewApi, type ReviewAnswer, type ReviewSession, type VocabularyEntry } from '../api/vocabularyReviewApi'
import '@/features/overview/statistics.css'

const changed = () => window.dispatchEvent(new Event('study-statistics-changed'))
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : 'Không thực hiện được. Vui lòng thử lại.'
export function VocabularyReviewPage() {
  const { email } = useAuthSession()
  return <VocabularyReviewContent key={email} />
}
function VocabularyReviewContent() {
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<VocabularyEntry[] | null>(null)
  const [session, setSession] = useState<ReviewSession | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState<ReviewAnswer | null>(null)
  const [expired, setExpired] = useState(false)
  const startRequest = useRef<string | null>(null)
  const live = useRef(true)
  const searching = useRef<AbortController | null>(null)
  useEffect(() => { live.current = true; return () => { live.current = false; searching.current?.abort() } }, [])
  useEffect(() => {
    if (!session) return
    const delay = Math.max(0, Date.parse(session.expiresAt) - Date.now())
    const timer = window.setTimeout(() => setExpired(true), delay)
    return () => window.clearTimeout(timer)
  }, [session])
  const items = session?.items.filter((item) => !item.answered) ?? []
  const item = items[index]

  async function search() {
    if (!query.trim() || busy) return
    searching.current?.abort()
    const controller = new AbortController()
    searching.current = controller
    setBusy(true); setError(null); setEntries(null)
    try { const found = await vocabularyReviewApi.search(query.trim(), controller.signal); if (live.current) setEntries(found) }
    catch (reason) { if (live.current && !controller.signal.aborted) setError(errorMessage(reason)) }
    finally { if (live.current) setBusy(false) }
  }
  async function add(id: string) {
    if (busy) return
    setBusy(true); setError(null); setNotice(null)
    try { await vocabularyReviewApi.add(id); changed(); if (live.current) setNotice('Đã thêm nghĩa từ vào danh sách học. Thêm lại không tạo bản trùng.') }
    catch (reason) { if (live.current) setError(errorMessage(reason)) }
    finally { if (live.current) setBusy(false) }
  }
  async function start() {
    if (busy) return
    setBusy(true); setError(null); setNotice(null)
    startRequest.current ??= crypto.randomUUID()
    try {
      const created = await vocabularyReviewApi.start(startRequest.current)
      if (!live.current) return
      startRequest.current = null
      setSession(created); setIndex(0); setRevealed(false); setPending(null)
      setExpired(Date.parse(created.expiresAt) <= Date.now())
    } catch (reason) { if (live.current) setError(errorMessage(reason)) }
    finally { if (live.current) setBusy(false) }
  }
  async function answer(outcome: ReviewAnswer['outcome']) {
    if (!session || !item || busy || !revealed || expired) return
    const body = pending ?? { requestId: crypto.randomUUID(), vocabularySenseId: item.vocabularySenseId, expectedVersion: item.stateVersion, outcome }
    setPending(body); setBusy(true); setError(null)
    try {
      const result = await vocabularyReviewApi.answer(session.id, body)
      changed()
      if (!live.current) return
      setPending(null); setIndex((value) => value + 1); setRevealed(false)
      setNotice(`Đã ghi nhận. Lần ôn tiếp: ${result.nextReviewAt ? new Date(result.nextReviewAt).toLocaleString('vi-VN') : 'chưa lên lịch'}.`)
    } catch (reason) {
      if (!live.current) return
      if (reason instanceof HttpError && (reason.status === 409 || reason.status === 404)) {
        setExpired(true); setPending(null)
        setError('Phiên ôn đã thay đổi, hết hạn hoặc từ không còn khả dụng. Hãy tải lượt ôn mới để dùng trạng thái mới nhất.')
      } else setError(`${errorMessage(reason)} Thử lại sẽ gửi đúng câu trả lời vừa rồi.`)
    } finally { if (live.current) setBusy(false) }
  }
  return <main className="vocabulary-review-page">
    <Link to="/overview?tab=detailed-stats">← Về dữ liệu chi tiết</Link>
    <h1 className="text-2xl font-bold">Ôn từ vựng của tôi</h1>
    <p>Từ mới và từ đến hạn được chọn từ danh sách của bạn. Hãy tự nhớ nghĩa trước khi lật đáp án; kết quả là mức ghi nhớ tự đánh giá.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <section aria-label="Lượt ôn" className="vocabulary-review-answer">
      {!session || !item || expired ? <>
        <p>{expired ? 'Phiên ôn đã kết thúc hoặc cần đồng bộ lại.' : session ? items.length ? 'Bạn đã hoàn thành lượt ôn này.' : 'Chưa có từ mới hoặc từ đến hạn. Bạn có thể thêm từ bên dưới.' : 'Mỗi lượt có tối đa 20 nghĩa từ.'}</p>
        <Button disabled={busy} onClick={() => void start()}>{busy ? 'Đang tải…' : 'Bắt đầu / tải lượt ôn mới'}</Button>
      </> : <>
        <StudyActivityTracker key={session.id} sourceType="VOCABULARY_REVIEW" sourceId={session.id} />
        <p>Từ {index + 1}/{items.length}</p><h2 className="text-3xl font-bold">{item.lemma}</h2>
        {revealed ? <><p>{item.meaning}</p>{item.exampleSentence && <p>{item.exampleSentence}</p>}<div className="statistics-controls">
          {pending ? <Button disabled={busy} onClick={() => void answer(pending.outcome)}>Gửi lại câu trả lời</Button> : <><Button disabled={busy} onClick={() => void answer('REMEMBERED')}>Tôi nhớ đúng</Button><Button variant="outline" disabled={busy} onClick={() => void answer('FORGOT')}>Tôi chưa nhớ</Button></>}
        </div></> : <Button onClick={() => setRevealed(true)}>Lật đáp án</Button>}
      </>}
    </section>
    <section aria-label="Thêm từ để ôn">
      <h2 className="text-xl font-bold">Thêm nghĩa từ vào danh sách học</h2>
      <form className="statistics-controls" onSubmit={(event) => { event.preventDefault(); void search() }}><label htmlFor="vocabulary-query">Từ cần tìm</label><Input id="vocabulary-query" value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} /><Button disabled={busy || !query.trim()} type="submit">Tìm từ</Button></form>
      {entries?.length === 0 && <p>Không có kết quả phù hợp.</p>}
      <ul className="vocabulary-search-results">{entries?.map((entry) => <li key={entry.id}><strong>{entry.lemma}</strong>{entry.senses.map((sense) => <div key={sense.id}><p>{sense.vietnameseMeaning || sense.englishDefinition}</p><Button variant="outline" disabled={busy} onClick={() => void add(sense.id)}>Thêm nghĩa này</Button></div>)}</li>)}</ul>
    </section>
  </main>
}
