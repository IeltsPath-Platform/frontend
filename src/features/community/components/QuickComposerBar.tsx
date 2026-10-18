import { Image, Video, Smile } from 'lucide-react'

export interface QuickComposerBarProps {
  userName: string
  onOpenComposer: () => void
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
          onClick={onOpenComposer}
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
          onClick={onOpenComposer}
          aria-label="Đăng ảnh"
        >
          <Image size={18} className="community-quick-icon-green" />
          <span>Ảnh/video</span>
        </button>

        <button
          type="button"
          className="community-quick-btn community-quick-btn-video"
          onClick={onOpenComposer}
          aria-label="Đăng video"
        >
          <Video size={18} className="community-quick-icon-red" />
          <span>Video</span>
        </button>

        <button
          type="button"
          className="community-quick-btn community-quick-btn-emoji"
          onClick={onOpenComposer}
          aria-label="Cảm xúc"
        >
          <Smile size={18} className="community-quick-icon-yellow" />
          <span>Cảm xúc</span>
        </button>
      </div>
    </div>
  )
}
