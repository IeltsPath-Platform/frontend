import React, { useRef, useEffect } from 'react'
import { Eye, Type } from 'lucide-react'

interface PracticeSettingsPopoverProps {
  isOpen: boolean
  onClose: () => void
  eyeComfort: boolean
  onToggleEyeComfort: (val: boolean) => void
  fontSize: 'small' | 'medium' | 'large'
  onChangeFontSize: (size: 'small' | 'medium' | 'large') => void
}

export const PracticeSettingsPopover: React.FC<PracticeSettingsPopoverProps> = ({
  isOpen,
  onClose,
  eyeComfort,
  onToggleEyeComfort,
  fontSize,
  onChangeFontSize,
}) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="screen3-settings-popover" ref={ref}>
      <div className="popover-arrow-up" />

      {/* Chế độ bảo vệ mắt */}
      <div className="popover-row">
        <div className="popover-label-group">
          <Eye size={15} className="text-slate-600" />
          <span className="popover-text">Chế độ bảo vệ mắt</span>
        </div>
        <button
          type="button"
          className={`popover-switch ${eyeComfort ? 'active' : ''}`}
          onClick={() => onToggleEyeComfort(!eyeComfort)}
          role="switch"
          aria-checked={eyeComfort}
        >
          <span className="switch-knob" />
        </button>
      </div>

      {/* Kích cỡ chữ: S M L */}
      <div className="popover-row">
        <div className="popover-label-group">
          <Type size={15} className="text-slate-600" />
          <span className="popover-text">Kích cỡ chữ</span>
        </div>
        <div className="popover-font-pills">
          <button
            type="button"
            className={`font-pill ${fontSize === 'small' ? 'active' : ''}`}
            onClick={() => onChangeFontSize('small')}
          >
            S
          </button>
          <button
            type="button"
            className={`font-pill ${fontSize === 'medium' ? 'active' : ''}`}
            onClick={() => onChangeFontSize('medium')}
          >
            M
          </button>
          <button
            type="button"
            className={`font-pill ${fontSize === 'large' ? 'active' : ''}`}
            onClick={() => onChangeFontSize('large')}
          >
            L
          </button>
        </div>
      </div>
    </div>
  )
}
