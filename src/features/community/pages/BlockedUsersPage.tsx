import { ArrowLeft, Ban } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteNavbar } from '@/components/SiteNavbar'
import { Loading } from '@/components/loading/Loading'
import { useToast } from '@/components/toast/toastContext'
import { communityApi, type PublicProfile } from '../api/communityApi'
import './community.css'
import './NotificationPreferencesPage.css'

const PAGE_SIZE = 20

/** People the learner has blocked in the community, with a way to unblock each one. */
export function BlockedUsersPage() {
  const { toast } = useToast()
  const [people, setPeople] = useState<PublicProfile[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)

  const fetchPage = (nextPage: number) =>
    communityApi.blockedUsers(nextPage, PAGE_SIZE)
      .then((result) => {
        setPeople((current) => [...current, ...result.content])
        setPage(result.page)
        setTotalPages(result.totalPages)
      })
      .catch(() => setError('Không thể tải danh sách người đã chặn.'))
      .finally(() => setLoading(false))

  useEffect(() => {
    void communityApi.blockedUsers(0, PAGE_SIZE)
      .then((result) => {
        setPeople(result.content)
        setPage(result.page)
        setTotalPages(result.totalPages)
      })
      .catch(() => setError('Không thể tải danh sách người đã chặn.'))
      .finally(() => setLoading(false))
  }, [])

  const loadMore = () => {
    setLoading(true)
    setError('')
    void fetchPage(page + 1)
  }

  const unblock = async (person: PublicProfile) => {
    setPendingId(person.id)
    try {
      await communityApi.unblock(person.id)
      setPeople((current) => current.filter((item) => item.id !== person.id))
      toast({ title: `Đã bỏ chặn ${person.displayName}`, tone: 'success' })
    } catch {
      setError('Không thể bỏ chặn. Vui lòng thử lại.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="community-page">
      <SiteNavbar />
      <main className="notification-preferences-page">
        <Link className="notification-preferences-back" to="/community">
          <ArrowLeft size={16} aria-hidden="true" /> Quay lại cộng đồng
        </Link>
        <header className="notification-preferences-hero">
          <span className="notification-preferences-hero-icon" aria-hidden="true"><Ban size={26} /></span>
          <div>
            <h1>Người đã chặn</h1>
            <p>Bạn và những người này không thấy bài viết, bình luận và hồ sơ của nhau.</p>
          </div>
        </header>

        {error && <p className="notification-preferences-error" role="alert">{error}</p>}

        {loading && people.length === 0 ? (
          <Loading />
        ) : people.length === 0 ? (
          <p className="py-8 text-center text-slate-500">Bạn chưa chặn ai.</p>
        ) : (
          <section className="notification-preferences-group" aria-label="Danh sách người đã chặn">
            <ul className="notification-preferences-list">
              {people.map((person) => (
                <li key={person.id}>
                  <span className="community-avatar" aria-hidden="true">
                    {person.avatarUrl?.startsWith('https://')
                      ? <img src={person.avatarUrl} alt="" referrerPolicy="no-referrer" />
                      : person.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="notification-preferences-text">
                    <strong>{person.displayName}</strong>
                  </div>
                  <button
                    type="button"
                    className="community-secondary"
                    disabled={pendingId === person.id}
                    onClick={() => void unblock(person)}
                  >
                    {pendingId === person.id ? 'Đang bỏ chặn…' : 'Bỏ chặn'}
                  </button>
                </li>
              ))}
            </ul>
            {page + 1 < totalPages && (
              <button type="button" className="community-secondary" disabled={loading} onClick={loadMore}>
                {loading ? 'Đang tải…' : 'Xem thêm'}
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
