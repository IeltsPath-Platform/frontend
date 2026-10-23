import { useState, type FormEvent } from 'react'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { cancelSchedule, listSchedules, publishVersion, scheduleVersion } from '../api/packageApi'
import { publicationError } from '../lib/packageLabels'
import type { PackageType, PackageVersion } from '../types'

export function PublishPanel({ packageId, version, packageType, disabled, onMutate, onPreview }: {
  packageId: string; version: PackageVersion; packageType: PackageType; disabled: boolean
  onMutate: (action: () => Promise<unknown>, message: string) => Promise<boolean>; onPreview: () => void
}) {
  const schedules = useAdminResource(`package-schedules:${packageId}:${version.id}`, (signal) => listSchedules(packageId, signal))
  const [publishAt, setPublishAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const current = schedules.data?.find((schedule) => schedule.versionId === version.id)
  const scheduledAt = current?.publishAt ?? version.publishAt
  const lastError = current?.lastPublishError ?? version.lastPublishError
  const locked = disabled || schedules.status !== 'success'
  function publish() {
    const finalTest = packageType === 'TOPIC_TEST' || packageType === 'COURSE_TEST'
    if (locked || version.status !== 'DRAFT' || !window.confirm(`Xuất bản phiên bản này?${finalTest ? ' Đề sẽ vào nhóm đề thi của chủ đề/khóa này ngay khi xuất bản; học viên thi lại sẽ có thể nhận đề này.' : ''}`)) return
    void onMutate(() => publishVersion(packageId, version.id), 'Đã xuất bản phiên bản.').then((ok) => { if (ok) schedules.reload() })
  }
  async function schedule(event: FormEvent) {
    event.preventDefault()
    if (locked || version.status !== 'DRAFT') return
    const time = new Date(publishAt)
    if (!publishAt || !Number.isFinite(time.getTime()) || time.getTime() <= Date.now()) { setError('Chọn thời gian xuất bản ở tương lai.'); return }
    setError(null)
    if (await onMutate(() => scheduleVersion(packageId, version.id, time.toISOString()), 'Đã lên lịch xuất bản.')) schedules.reload()
  }
  return <section className="adm-card adm-package-publish" aria-label="Xem trước và xuất bản"><h2>Xem trước và xuất bản</h2>
    <button className="adm-btn" type="button" disabled={disabled} onClick={onPreview}>Xem trước</button>
    {schedules.status === 'loading' ? <AdminLoading label="Đang tải lịch xuất bản…" /> : null}
    {schedules.status === 'error' ? <AdminError message={schedules.error!} onRetry={schedules.reload} /> : null}
    {scheduledAt ? <p>Đã lên lịch: {new Date(scheduledAt).toLocaleString('vi-VN')}</p> : null}
    {lastError ? <p className="adm-alert" role="status">{publicationError(lastError)}</p> : null}
    {version.status === 'DRAFT' ? <>
      <button className="adm-btn adm-btn--primary" type="button" disabled={locked} onClick={publish}>Xuất bản ngay</button>
      <form noValidate onSubmit={(event) => void schedule(event)} aria-label="Lên lịch xuất bản">
        <label className="adm-field"><span>Thời gian xuất bản (giờ địa phương)</span><input className="adm-input" type="datetime-local" value={publishAt} disabled={locked} onChange={(event) => setPublishAt(event.target.value)} /></label>
        {error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}
        <div className="adm-package-actions"><button className="adm-btn" type="submit" disabled={locked}>Lên lịch</button>{scheduledAt ? <button className="adm-btn" type="button" disabled={locked} onClick={() => void onMutate(() => cancelSchedule(packageId, version.id), 'Đã hủy lịch xuất bản.').then((ok) => { if (ok) schedules.reload() })}>Hủy lịch</button> : null}</div>
      </form>
    </> : null}
    <p className="adm-muted">Gói tạo ở đây chưa có nhóm dạng đề nên không xuất hiện khi học viên lọc theo dạng đề.</p>
  </section>
}
