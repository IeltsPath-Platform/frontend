import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { fetchAsset } from '../api/lessonApi'

const TYPE_LABEL = { PASSAGE: 'Đoạn văn', AUDIO: 'Âm thanh', IMAGE: 'Hình ảnh', VIDEO: 'Video' } as const

/** What an asset block holds, shown as the learner gets it: the picture, a player, or the text, with its type named. */
export function AssetBlockPreview({ assetId }: { assetId: string | null }) {
  const asset = useAdminResource(`asset|${assetId}`, (signal) => (assetId ? fetchAsset(assetId, signal) : Promise.reject(new Error('Block chưa có tài nguyên.'))))
  if (asset.status === 'loading') return <AdminLoading label="Đang tải tài nguyên…" />
  if (asset.status === 'error' || !asset.data) return <AdminError message={asset.error ?? 'Không tải được tài nguyên.'} onRetry={asset.reload} />
  const { assetType, mediaUrl, textContent, durationSeconds } = asset.data
  return (
    <div className="ls-asset">
      <span className="adm-badge">{TYPE_LABEL[assetType]}{durationSeconds ? ` · ${durationSeconds}s` : ''}</span>
      {assetType === 'IMAGE' && mediaUrl ? <img alt="Tài nguyên của block" className="ls-asset__image" src={mediaUrl} /> : null}
      {assetType === 'AUDIO' && mediaUrl ? <audio controls preload="none" src={mediaUrl} /> : null}
      {assetType === 'VIDEO' && mediaUrl ? <video className="ls-asset__image" controls preload="none" src={mediaUrl} /> : null}
      {textContent ? <p className="ls-asset__text">{textContent}</p> : null}
      {!mediaUrl && !textContent ? <p className="adm-muted">Tài nguyên không có nội dung để hiển thị.</p> : null}
    </div>
  )
}
