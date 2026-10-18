import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteNavbar } from '@/components/SiteNavbar'
import { useAuthSession } from '@/features/auth/authSession'
import { communityApi, type ContentReportQueueItem } from '../api/communityApi'
import './community.css'

export function ContentReportsAdminPage() {
  const { roles } = useAuthSession()
  const [items, setItems] = useState<ContentReportQueueItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try { setItems((await communityApi.pendingReports()).content); setError('') }
    catch { setError('Không thể tải hàng chờ báo cáo.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    if (!roles?.includes('ADMIN')) return
    void (async () => {
      try { setItems((await communityApi.pendingReports()).content); setError('') }
      catch { setError('Không thể tải hàng chờ báo cáo.') }
      finally { setLoading(false) }
    })()
  }, [roles])
  const resolve = async (item: ContentReportQueueItem, decision: 'DISMISS' | 'HIDE_CONTENT') => {
    try { await communityApi.resolveReport(item.id, decision); setItems((current) => current.filter((entry) => entry.id !== item.id)); setError('') }
    catch { setError('Không thể xử lý báo cáo. Hãy tải lại hàng chờ.') }
  }
  const shortId = (id: string) => `${id.slice(0, 8)}…`

  return <div className="community-page"><SiteNavbar /><main className="community-report-admin"><p className="community-eyebrow">QUẢN TRỊ CỘNG ĐỒNG</p><h1>Hàng chờ báo cáo</h1>{!roles?.includes('ADMIN') ? <p role="alert">Bạn không có quyền xem hàng chờ này.</p> : loading ? <p role="status">Đang tải báo cáo…</p> : <>{error && <p role="alert">{error} <button type="button" onClick={() => void load()}>Thử lại</button></p>}{items.length === 0 && !error ? <p>Không có báo cáo đang chờ.</p> : <ul>{items.map((item) => <li key={item.id}><div><span>{item.contentType === 'POST' ? 'Bài viết' : 'Bình luận'} · {new Date(item.createdAt).toLocaleString('vi-VN')}</span><p>{item.contentPreview ?? 'Nội dung không còn tồn tại.'}</p><blockquote>{item.reason}</blockquote><small>Người báo cáo: {item.reporterDisplayName || shortId(item.reporterId)}</small>{item.contentAuthorId && <small> · Tác giả: {item.contentAuthorDisplayName || shortId(item.contentAuthorId)}</small>}<Link to={item.contentType === 'POST' ? `/community/posts/${item.contentId}` : '/community'}>Mở nội dung</Link></div><div className="community-report-actions"><button type="button" onClick={() => void resolve(item, 'DISMISS')}>Bỏ qua</button><button type="button" className="community-primary" onClick={() => void resolve(item, 'HIDE_CONTENT')}>Ẩn nội dung</button></div></li>)}</ul>}</>}</main></div>
}
