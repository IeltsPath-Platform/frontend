import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { PracticeCard } from '@/types/practice'

interface PracticeModeModalProps {
  card: PracticeCard | null
  isOpen: boolean
  onClose: () => void
  onConfirmMode: (mode: 'exam' | 'practice') => void
}

export const PracticeModeModal: React.FC<PracticeModeModalProps> = ({
  card,
  isOpen,
  onClose,
  onConfirmMode,
}) => {
  const [selectedMode, setSelectedMode] = useState<'exam' | 'practice'>('practice')

  if (!isOpen || !card) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="practice-screen2-dialog practice-mode-dialog">
        {/* Top White Header with Blue Title & Close */}
        <div className="screen2-top-header">
          <DialogTitle className="screen2-test-title">{card.title}</DialogTitle>
        </div>

        {/* Deep Royal Blue Body */}
        <div className="screen2-blue-body">
          <DialogDescription className="screen2-section-heading">Lựa chọn chế độ làm bài</DialogDescription>

          <div className="screen2-cards-grid">
            {/* Option 1: Giao diện Thi thật */}
            <button type="button" aria-pressed={selectedMode === 'exam'}
              className={`screen2-mode-card ${selectedMode === 'exam' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('exam')}
            >
              <span className="exam-similarity-badge">Thi thử</span>
              {/* Preview mockup */}
              <div className="mode-preview-img-box">
                <div className="mock-exam-header" />
                <div className="mock-exam-content">
                  <div className="mock-col-left" />
                  <div className="mock-col-right" />
                </div>
              </div>
              <span className="mode-title block">Thi thử</span>
              <p className="mode-description">
                Tập trung như phòng thi thật. Không có Highlight, Note, tra từ hay Flashcard.
              </p>
            </button>

            {/* Option 2: Giao diện Luyện tập */}
            <button type="button" aria-pressed={selectedMode === 'practice'}
              className={`screen2-mode-card ${selectedMode === 'practice' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('practice')}
            >
              {/* Preview mockup */}
              <div className="mode-preview-img-box">
                <div className="mock-practice-subnav" />
                <div className="mock-practice-workspace">
                  <div className="mock-p-tools" />
                  <div className="mock-p-passage" />
                  <div className="mock-p-questions" />
                </div>
              </div>
              <span className="mode-title block">Luyện tập</span>
              <p className="mode-description">
                Học chủ động với các hỗ trợ phù hợp cho từng kỹ năng và xem lại tiến độ của bạn.
              </p>
            </button>
          </div>

          {/* Orange CTA Button */}
          <div className="screen2-action-footer">
            <button
              type="button"
              className="screen2-start-cta"
              onClick={() => onConfirmMode(selectedMode)}
            >
              BẮT ĐẦU LÀM BÀI
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
