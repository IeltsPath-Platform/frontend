import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import writingExamPreview from '@/assets/writing-exam-preview.png'
import writingPracticePreview from '@/assets/writing-practice-preview.png'
import type { WritingMode } from '../writing/writingApi'

/** The two screens of a Writing task, named as in Reading: practice (task with its guide, one answer box, dictionary) or the timed exam. */
export function WritingModeModal({ title, onClose, onConfirm }: {
  title: string
  onClose: () => void
  onConfirm: (mode: WritingMode) => void
}) {
  const [selected, setSelected] = useState<WritingMode>('practice')

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="practice-screen2-dialog practice-mode-dialog practice-mode-selection-dialog">
        <div className="screen2-top-header">
          <DialogTitle className="screen2-test-title">{title}</DialogTitle>
        </div>
        <div className="screen2-blue-body">
          <DialogDescription className="screen2-section-heading">Chọn giao diện làm bài</DialogDescription>
          <div className="screen2-cards-grid">
            <button type="button" aria-pressed={selected === 'practice'} className={`screen2-mode-card ${selected === 'practice' ? 'selected' : ''}`} onClick={() => setSelected('practice')}>
              <div className="mode-preview-img-box mode-preview-img-box-photo">
                <img src={writingPracticePreview} alt="Giao diện luyện tập Writing: đề bài, bài làm và tra từ vựng" />
              </div>
              <span className="mode-title block">Giao diện Luyện tập</span>
              <p className="mode-description">Có hướng dẫn và lưu ý của đề, ô viết bài và tra từ vựng, kéo thanh để chia lại khung. Phù hợp để luyện tập.</p>
            </button>
            <button type="button" aria-pressed={selected === 'exam'} className={`screen2-mode-card ${selected === 'exam' ? 'selected' : ''}`} onClick={() => setSelected('exam')}>
              <div className="mode-preview-img-box mode-preview-img-box-photo">
                <img src={writingExamPreview} alt="Giao diện thi máy Writing: đề bài bên trái, ô viết bên phải" />
              </div>
              <span className="mode-title block">Giao diện Thi thật</span>
              <p className="mode-description">Mô phỏng giao diện thi máy: đồng hồ đếm ngược, không hướng dẫn, hết giờ tự nộp bài.</p>
            </button>
          </div>
          <div className="screen2-action-footer">
            <button type="button" className="screen2-start-cta" onClick={() => onConfirm(selected)}>BẮT ĐẦU LÀM BÀI</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
