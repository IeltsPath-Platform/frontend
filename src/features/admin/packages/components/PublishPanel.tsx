import { useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { AdminField } from '../../components/AdminField'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { cancelSchedule, listSchedules, publishVersion, scheduleVersion } from '../api/packageApi'
import { publicationError } from '../lib/packageLabels'
import type { PackageType, PackageVersion } from '../types'
import { useAdminError } from '../../lib/useAdminError'

export function PublishPanel({ packageId, version, packageType, disabled, onMutate, onPreview }: {
  packageId: string; version: PackageVersion; packageType: PackageType; disabled: boolean
  onMutate: (action: () => Promise<unknown>, message: string) => Promise<boolean>; onPreview: () => void
}) {
  const { confirm, confirmDialog } = useAdminConfirm()
  const schedules = useAdminResource(`package-schedules:${packageId}:${version.id}`, (signal) => listSchedules(packageId, signal))
  const [publishAt, setPublishAt] = useState('')
  const [, setError] = useAdminError()
  const current = schedules.data?.find((schedule) => schedule.versionId === version.id)
  const scheduledAt = current?.publishAt ?? version.publishAt
  const lastError = current?.lastPublishError ?? version.lastPublishError
  const locked = disabled || schedules.status !== 'success'
  const schema = useMemo(() => z.object({ publishAt: z.string().superRefine((value, ctx) => {
    if (value === '') { ctx.addIssue({ code: 'custom', message: 'Thời gian xuất bản không được để trống.' }); return }
    const time = new Date(value).getTime()
    // eslint-disable-next-line react-hooks/purity -- "in the future" is judged against the moment of the check, by design
    if (!Number.isFinite(time) || time <= Date.now()) ctx.addIssue({ code: 'custom', message: 'Chọn thời gian xuất bản ở tương lai.' })
  }) }), [])
  const form = useFormErrors(schema, { publishAt })
  async function publish() {
    const finalTest = packageType === 'TOPIC_TEST' || packageType === 'COURSE_TEST'
    if (locked || version.status !== 'DRAFT') return
    if (!(await confirm({
      title: 'Xuất bản phiên bản này?',
      message: finalTest
        ? 'Đề sẽ vào nhóm đề thi của chủ đề/khóa này ngay khi xuất bản; học viên thi lại sẽ có thể nhận đề này.'
        : 'Học viên sẽ thấy phiên bản này ngay khi xuất bản.',
      confirmLabel: 'Xuất bản',
    }))) return
    void onMutate(() => publishVersion(packageId, version.id), 'Đã xuất bản phiên bản.').then((ok) => { if (ok) schedules.reload() })
  }
  async function schedule(event: FormEvent) {
    event.preventDefault()
    if (locked || version.status !== 'DRAFT') return
    if (!form.validate()) return
    const time = new Date(publishAt)
    setError(null)
    if (await onMutate(() => scheduleVersion(packageId, version.id, time.toISOString()), 'Đã lên lịch xuất bản.')) schedules.reload()
  }
  return <section className="adm-pe-publish" aria-label="Xem trước và xuất bản">
    {confirmDialog}
    <div className="adm-pe-publish__head">
      <h3 className="adm-sec__title">Xuất bản</h3>
      <div className="adm-pe-tools">
        <button className="adm-btn adm-btn--small adm-btn--noicon" type="button" disabled={disabled} onClick={onPreview}>Xem trước</button>
        {version.status === 'DRAFT' ? <button className="adm-btn adm-btn--small adm-btn--primary adm-btn--noicon" type="button" disabled={locked} onClick={publish}>Xuất bản ngay</button> : null}
      </div>
    </div>
    {schedules.status === 'loading' ? <AdminLoading label="Đang tải lịch xuất bản…" /> : null}
    {schedules.status === 'error' ? <AdminError message={schedules.error!} onRetry={schedules.reload} /> : null}
    {scheduledAt ? <p className="adm-pe-publish__scheduled">Đã lên lịch: {new Date(scheduledAt).toLocaleString('vi-VN')}</p> : null}
    {lastError ? <p className="adm-alert" role="status">{publicationError(lastError)}</p> : null}
    {version.status === 'DRAFT' ? <form className="adm-pe-schedule" noValidate onSubmit={(event) => void schedule(event)} aria-label="Lên lịch xuất bản">
      <AdminField label="Thời gian xuất bản (giờ địa phương)" {...form.field('publishAt')} required><input className="adm-input" type="datetime-local" value={publishAt} disabled={locked} onChange={(event) => setPublishAt(event.target.value)} /></AdminField>
      <div className="adm-pe-schedule__actions">
        <button className="adm-btn adm-btn--small adm-btn--noicon" type="submit" disabled={locked}>Lên lịch</button>
        {scheduledAt ? <button className="adm-btn adm-btn--small adm-btn--noicon" type="button" disabled={locked} onClick={() => void onMutate(() => cancelSchedule(packageId, version.id), 'Đã hủy lịch xuất bản.').then((ok) => { if (ok) schedules.reload() })}>Hủy lịch</button> : null}
      </div>
    </form> : null}
  </section>
}
