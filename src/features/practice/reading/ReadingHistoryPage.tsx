import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock3, RotateCcw } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { HttpError } from '@/lib/httpClient'
import { getReadingHistory, searchReadingTests, type ReadingHistoryItem, type ReadingTestCard } from './readingPracticeApi'
import { historyTitle, historyTitleMap, historyTitleRequests } from '../lib/historyTitles'
import './reading-practice.css'

export function ReadingHistoryPage() {
  const [items, setItems] = useState<ReadingHistoryItem[]>([])
  const [titles, setTitles] = useState<Map<string, string>>(new Map())
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      setLoading(true)
      setError('')
    })
    void getReadingHistory(page, controller.signal).then(async (result) => {
      const requests = historyTitleRequests(result.items)
      const responses = await Promise.all(requests.map(async (request) => ({
        scope: request.scope,
        items: (await searchReadingTests({ scope: request.scope, only: request.only, page: 0, size: 50 }, controller.signal)).items as ReadingTestCard[],
      })))
      if (controller.signal.aborted) return
      setItems((current) => page === 0 ? result.items : [...current, ...result.items])
      setTitles((current) => new Map([...current, ...historyTitleMap(responses)]))
      setTotal(result.totalElements)
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof HttpError ? cause.message : 'Không tải được lịch sử Reading.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, reload])

  return <div className="reading-practice-page"><SiteNavbar /><main className="reading-history-page">
    <header><Link to="/practice-tests?skill=reading"><ArrowLeft size={17} /> Danh mục Reading</Link><h1>Lịch sử làm bài Reading</h1><p>Các bài Reading bạn đã nộp.</p></header>
    {error && <div role="alert" className="reading-state reading-error"><p>{error}</p><button type="button" onClick={() => setReload((value) => value + 1)}>Thử lại</button></div>}
    {loading && <p role="status">Đang tải lịch sử…</p>}
    {!loading && !error && items.length === 0 && <section className="reading-state reading-empty"><h2>Bạn chưa nộp bài Reading nào</h2><Link to="/practice-tests?skill=reading">Chọn đề Reading</Link></section>}
    <ol className="reading-history-list">{items.filter((item) => item.status === 'SUBMITTED').map((item) => <li key={item.attemptId}>
      <div><h2>{historyTitle(item, titles)}</h2><p>{item.scope === 'PART' && item.partNos[0] ? `Passage ${item.partNos[0]}` : 'Full test'}</p>
      <time dateTime={item.submittedAt ?? undefined}>{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('vi-VN') : 'Ngày nộp chưa có'}</time></div>
      <strong>{item.percent === null ? '—' : `${Math.round(item.percent)}%`}</strong>
      <Link to={`/practice/reading/attempts/${item.attemptId}/result`}>Xem kết quả</Link>
    </li>)}</ol>
    {!loading && items.length < total && <button className="reading-history-more" type="button" onClick={() => setPage((value) => value + 1)}><RotateCcw size={16} /> Xem thêm</button>}
    <p className="reading-history-count"><Clock3 size={15} /> {items.length} / {total} bài đã nộp</p>
  </main></div>
}
