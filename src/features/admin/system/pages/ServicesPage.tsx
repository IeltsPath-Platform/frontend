import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'
import { fetchServiceSnapshot } from '../api/systemAdminApi'
import type { ServiceSnapshot } from '../types'
import '../system.css'

const REFRESH_INTERVAL_MS = 30_000

function serviceLabel(serviceId: string) {
  const label = serviceId.replace(/-SERVICE$/, '').replace(/-/g, ' ').toLowerCase()
  return label.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}

function fastestResponse(snapshot: ServiceSnapshot['services'][number]) {
  const durations = snapshot.instances.map((instance) => instance.responseMs).filter((value): value is number => value != null)
  return durations.length ? `${Math.min(...durations)} ms` : '—'
}

function checkedTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function ServicesPage() {
  const [snapshot, setSnapshot] = useState<ServiceSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const request = useRef<AbortController | null>(null)
  const hasSnapshot = useRef(false)

  const reload = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setError(null)
    if (!hasSnapshot.current) setLoading(true)
    try {
      const nextSnapshot = await fetchServiceSnapshot(controller.signal)
      if (controller.signal.aborted) return
      setSnapshot(nextSnapshot)
      hasSnapshot.current = true
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được trạng thái dịch vụ.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void reload(), 0)
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    const timer = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS)
    document.addEventListener('visibilitychange', refreshIfVisible)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      request.current?.abort()
    }
  }, [reload])

  return (
    <AdminPage
      actions={<button className="adm-btn" disabled={loading} onClick={() => void reload()} type="button"><RefreshCw aria-hidden="true" size={16} /> Kiểm tra lại</button>}
      subtitle={snapshot ? `Kiểm tra lúc ${checkedTime(snapshot.checkedAt)}` : 'Trạng thái các dịch vụ của nền tảng.'}
      title="Dịch vụ"
    >
      {loading && !snapshot ? <AdminLoading label="Đang kiểm tra dịch vụ…" /> : null}
      {error ? <AdminError message={error} onRetry={() => void reload()} /> : null}
      {snapshot ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="adm-sr-only">Trạng thái dịch vụ và các instance</caption>
            <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Dịch vụ</th><th scope="col">Trạng thái</th><th scope="col">Instance</th><th scope="col">Phản hồi nhanh nhất</th><th scope="col">URI instance</th></tr></thead>
            <tbody>{snapshot.services.map((service, index) => (
              <tr key={service.serviceId}>
                <td className="adm-stt">{index + 1}</td>
                <th scope="row">{serviceLabel(service.serviceId)}</th>
                <td><span className={`adm-badge ${service.status === 'UP' ? 'adm-badge--ok' : 'adm-badge--danger'}`}>{service.status}</span></td>
                <td>{service.instances.length}</td>
                <td>{fastestResponse(service)}</td>
                <td><ul className="sys-instance-list">{service.instances.length
                  ? service.instances.map((instance) => <li className="adm-muted" key={instance.instanceId}>{instance.uri}</li>)
                  : <li className="adm-muted">Không có instance</li>}</ul></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}
    </AdminPage>
  )
}