import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { fetchRubricVersions } from '../api/rubricApi'
import { nextRubricVersion } from '../lib/nextRubricVersion'
import { rubricRequest } from '../lib/rubricDraft'
import type { Rubric, RubricRequest } from '../types'

export function RubricVersionDraftAction({ rubric, disabled, onCreate }: {
  rubric: Rubric; disabled: boolean; onCreate: (body: RubricRequest) => void
}) {
  const history = useAdminResource(`rubric-versions|${rubric.code}`, (signal) => fetchRubricVersions(rubric.code, signal))
  const version = history.status === 'success' && history.data !== null ? nextRubricVersion(history.data) : null
  return <>
    {history.status === 'loading' ? <AdminLoading label="Đang tải lịch sử phiên bản rubric…" /> : null}
    {history.status === 'error' ? <AdminError message={`Không tải được lịch sử phiên bản. ${history.error}`} onRetry={history.reload} /> : null}
    {version !== null ? <p className="adm-muted">Bản tiếp theo: {version} (theo toàn bộ lịch sử phiên bản).</p> : null}
    <button className="adm-btn" type="button" disabled={version === null || disabled} onClick={() => {
      if (version !== null && !disabled) onCreate({ ...rubricRequest(rubric), version })
    }}>Tạo bản nháp từ bản đang dùng</button>
  </>
}
