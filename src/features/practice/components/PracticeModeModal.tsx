import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { PracticeCard } from '@/types/practice'

interface PracticeModeModalProps {
  card: PracticeCard | null
  isOpen: boolean
  onClose: () => void
  onConfirmMode: (mode: 'exam' | 'practice') => void
  /** Mode preselected when the dialog mounts. */
  defaultMode?: 'exam' | 'practice'
  /** When set, "Thi thật" cannot be chosen and this text explains why. */
  examDisabledReason?: string
  /** True while the attempt is being created. */
  busy?: boolean
  /** Failure of the last start attempt. */
  error?: string
}

export const PracticeModeModal: React.FC<PracticeModeModalProps> = ({
  card,
  isOpen,
  onClose,
  onConfirmMode,
  defaultMode = 'practice',
  examDisabledReason,
  busy = false,
  error,
}) => {
  const [selectedMode, setSelectedMode] = useState<'exam' | 'practice'>(examDisabledReason ? 'practice' : defaultMode)

  if (!isOpen || !card) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent className="practice-screen2-dialog practice-mode-dialog">
        {/* Top White Header with Blue Title & Close */}
        <div className="screen2-top-header">
          <DialogTitle className="screen2-test-title">{card.title}</DialogTitle>
        </div>

        {/* Deep Royal Blue Body */}
        <div className="screen2-blue-body">
          <DialogDescription className="screen2-section-heading">Chọn giao diện làm bài</DialogDescription>

          <div className="screen2-cards-grid">
            {/* Option 1: Giao diện Luyện tập */}
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
              <span className="mode-title block">Giao diện Luyện tập</span>
              <p className="mode-description">
                Hỗ trợ tối đa các chức năng: Highlight, ghi chú, tra từ vựng, Flashcard… Phù hợp để luyện tập.
              </p>
            </button>

            {/* Option 2: Giao diện Thi thật */}
            <button type="button" aria-pressed={selectedMode === 'exam'}
              disabled={Boolean(examDisabledReason)}
              className={`screen2-mode-card ${selectedMode === 'exam' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('exam')}
            >
              <span className="exam-similarity-badge">Giống 100%</span>
              {/* Preview mockup */}
              <div className="mode-preview-img-box">
                <div className="mock-exam-header" />
                <div className="mock-exam-content">
                  <div className="mock-col-left" />
                  <div className="mock-col-right" />
                </div>
              </div>
              <span className="mode-title block">Giao diện Thi thật</span>
              <p className="mode-description">
                Mô phỏng 100% giao diện thi máy, giúp các bạn quen với chức năng khi thi thật.
              </p>
              {examDisabledReason && <p className="mode-description" role="note">{examDisabledReason}</p>}
            </button>
          </div>

          {/* Orange CTA Button */}
          <div className="screen2-action-footer">
            {error && <p className="mode-description" role="alert">{error}</p>}
            <button
              type="button"
              className="screen2-start-cta"
              disabled={busy}
              onClick={() => onConfirmMode(selectedMode)}
            >
              {busy ? 'ĐANG TẠO BÀI LÀM…' : 'BẮT ĐẦU LÀM BÀI'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
