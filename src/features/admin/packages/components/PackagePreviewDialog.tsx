import { AdminModal } from '../../components/AdminLayer'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { getPackage } from '../api/packageApi'
import { PackagePreview } from './PackagePreview'

/**
 * A package seen as a learner would take it, opened from the catalog row. The version shown is the one the editor opens
 * on: the draft if there is one, else the published one, else the newest.
 */
export function PackagePreviewDialog({ packageId, title, onClose }: { packageId: string; title: string; onClose: () => void }) {
  const detail = useAdminResource(`package-preview-dialog:${packageId}`, (signal) => getPackage(packageId, signal))
  const pkg = detail.data
  const version = pkg?.versions.find((item) => item.status === 'DRAFT')
    ?? pkg?.versions.find((item) => item.id === pkg.currentPublishedVersionId)
    ?? pkg?.versions.at(-1)

  return (
    <AdminModal onClose={onClose} size="wide" title="Chi tiết gói" description={title}>
      {(close) => <>
        {detail.status === 'loading' ? <AdminLoading label="Đang tải gói…" /> : null}
        {detail.status === 'error' ? <AdminError message={detail.error ?? 'Không tải được gói.'} onRetry={detail.reload} /> : null}
        {detail.status === 'success' && !version ? <p className="adm-muted">Gói chưa có phiên bản nào để xem trước.</p> : null}
        {version ? <PackagePreview embedded packageId={packageId} versionId={version.id} onClose={close} /> : null}
      </>}
    </AdminModal>
  )
}
