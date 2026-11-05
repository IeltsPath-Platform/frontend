import { Image, Video, Smile } from 'lucide-react'

/** What the composer should have open when it appears: a media tab, or the emoji picker. */
export type ComposerIntent = 'IMAGE' | 'VIDEO' | 'EMOJI'

export interface QuickComposerBarProps {
  userName: string
  onOpenComposer: (intent?: ComposerIntent) => void
}

export function QuickComposerBar({
  userName,
  onOpenComposer,
}: QuickComposerBarProps) {
  const initial = (userName.slice(0, 1) || 'B').toUpperCase()

  return (
    <div className="community-quick-composer-card">
      <div className="community-quick-composer-top">
        <div className="community-avatar" aria-hidden="true">
          {initial}
        </div>
        <button
          type="button"
          className="community-quick-composer-input"
          onClick={() => onOpenComposer()}
          aria-label="Tạo bài viết mới"
        >
          {userName}, bạn đang nghĩ gì thế?
        </button>
      </div>

      <div className="community-quick-composer-divider" />

      <div className="community-quick-composer-actions">
        <button
          type="button"
          className="community-quick-btn community-quick-btn-image"
          onClick={() => onOpenComposer('IMAGE')}
          aria-label="Đăng ảnh"
        >
          <Image size={18} className="community-quick-icon-green" />
          <span>Ảnh</span>
        </button>

        <button
          type="button"
          className="community-quick-btn community-quick-btn-video"
          onClick={() => onOpenComposer('VIDEO')}
          aria-label="Đăng video"
        >
          <Video size={18} className="community-quick-icon-red" />
          <span>Video</span>
        </button>

        <button
          type="button"
          className="community-quick-btn community-quick-btn-emoji"
          onClick={() => onOpenComposer('EMOJI')}
          aria-label="Thêm cảm xúc"
        >
          <Smile size={18} className="community-quick-icon-yellow" />
          <span>Cảm xúc</span>
        </button>
      </div>
    </div>
  )
}
