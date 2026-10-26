import { AlertTriangle } from 'lucide-react'

interface SkipConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function SkipConfirmDialog({ isOpen, onConfirm, onCancel }: SkipConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="skip-dialog-title"
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '1.25rem',
          maxWidth: '420px',
          width: '100%',
          padding: '1.75rem',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <AlertTriangle size={28} aria-hidden="true" />
        </div>

        <h3 id="skip-dialog-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
          Tạm dừng phiên ôn tập?
        </h3>
        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
          Các câu trả lời bạn đã hoàn thành sẽ được lưu lại. Bạn có chắc muốn quay lại Sổ tay không?
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.75rem',
              borderRadius: '0.65rem',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tiếp tục học
          </button>

          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '0.75rem',
              borderRadius: '0.65rem',
              border: 'none',
              background: '#dc2626',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Thoát phiên
          </button>
        </div>
      </div>
    </div>
  )
}

