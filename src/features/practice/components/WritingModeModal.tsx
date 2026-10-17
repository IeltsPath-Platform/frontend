import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { WritingMode } from '../writing/writingApi'

/** The two ways to take a Writing task: write the whole essay alone, or be guided sentence by sentence. */
export function WritingModeModal({ title, onClose, onConfirm }: {
  title: string
  onClose: () => void
  onConfirm: (mode: WritingMode) => void
}) {
  const [selected, setSelected] = useState<WritingMode>('free')

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="practice-screen2-dialog practice-mode-dialog">
        <div className="screen2-top-header">
          <DialogTitle className="screen2-test-title">{title}</DialogTitle>
        </div>
        <div className="screen2-blue-body">
          <DialogDescription className="screen2-section-heading">Chọn chế độ làm bài</DialogDescription>
          <div className="screen2-cards-grid">
            <button type="button" aria-pressed={selected === 'free'} className={`screen2-mode-card ${selected === 'free' ? 'selected' : ''}`} onClick={() => setSelected('free')}>
              <div className="mode-preview-img-box">
                <div className="mock-practice-subnav" />
                <div className="mock-practice-workspace">
                  <div className="mock-p-passage" />
                  <div className="mock-p-questions" />
                </div>
              </div>
              <span className="mode-title block">Viết tự do</span>
              <p className="mode-description">Tự viết cả bài với hướng dẫn dạng văn bản, đếm từ, bấm giờ. Viết xong bấm Chấm điểm.</p>
            </button>
            <button type="button" aria-pressed={selected === 'guided'} className={`screen2-mode-card ${selected === 'guided' ? 'selected' : ''}`} onClick={() => setSelected('guided')}>
              <div className="mode-preview-img-box">
                <div className="mock-exam-header" />
                <div className="mock-exam-content">
                  <div className="mock-col-left" />
                  <div className="mock-col-right" />
                </div>
              </div>
              <span className="mode-title block">Hướng dẫn từng bước</span>
              <p className="mode-description">Chưa viết được cả bài? Hệ thống hướng dẫn bạn viết từng câu, từ lý thuyết đến gợi ý.</p>
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
